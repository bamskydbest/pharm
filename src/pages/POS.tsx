import { useEffect, useRef, useState } from "react";
import api from "../components/services/api";
import { useAuthStore } from "../components/store/authStore";

type CartItem = {
  _id: string;
  name: string;
  price: number;
  qty: number;
  stock?: number;
  category?: string;
  barcode?: string;
};

type PaymentSplit = {
  cash: number;
  momo: number;
  card: number;
};

type Customer = {
  _id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  isNew?: boolean;
};

type StoreType = "pharmacy" | "general";

type Product = {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode: string;
};

export default function POS() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "User";

  // Store type
  const [storeType, setStoreType] = useState<StoreType>("pharmacy");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paid, setPaid] = useState<PaymentSplit>({ cash: 0, momo: 0, card: 0 });
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Customer state
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "momo" | "card" | "split">("cash");

  // Refs
  const barcodeBuffer = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ==================== COMPUTED VALUES ==================== */
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = storeType === "pharmacy" ? 0 : subtotal * 0.00; // No VAT for now, can be configured
  const total = subtotal + tax;
  const totalPaid = paid.cash + paid.momo + paid.card;
  const change = totalPaid > total ? totalPaid - total : 0;
  const balance = total - totalPaid;

  const cartItemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  /* ==================== BARCODE SCANNING ==================== */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (barcodeTimer.current) clearTimeout(barcodeTimer.current);

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 3) {
          addByBarcode(barcodeBuffer.current);
        }
        barcodeBuffer.current = "";
        return;
      }

      if (/^[a-zA-Z0-9]$/.test(e.key)) {
        barcodeBuffer.current += e.key;
      }

      barcodeTimer.current = setTimeout(() => {
        barcodeBuffer.current = "";
      }, 120);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [storeType]);

  /* ==================== ADD ITEM BY BARCODE ==================== */
  const addByBarcode = async (code: string) => {
    try {
      const { data } = await api.get(`/inventory/barcode/${code}`, {
        params: { store: storeType },
      });
      addToCart(data);
    } catch {
      showNotification("Product not found", "error");
    }
  };

  /* ==================== ADD TO CART ==================== */
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) {
        if (existing.qty >= (product.stock || Infinity)) {
          showNotification("Maximum stock reached", "warning");
          return prev;
        }
        return prev.map((i) =>
          i._id === product._id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setProductSearch("");
    setShowProductSearch(false);
  };

  /* ==================== UPDATE QUANTITY ==================== */
  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i._id !== id) return i;
          const newQty = i.qty + delta;
          if (newQty <= 0) return { ...i, qty: 0 };
          if (newQty > (i.stock || Infinity)) {
            showNotification("Maximum stock reached", "warning");
            return i;
          }
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  };

  /* ==================== REMOVE FROM CART ==================== */
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
  };

  /* ==================== CLEAR CART ==================== */
  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Clear all items from cart?")) {
      setCart([]);
      setPaid({ cash: 0, momo: 0, card: 0 });
    }
  };

  /* ==================== OFFLINE QUEUE SYNC ==================== */
  useEffect(() => {
    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem("offline_sales");
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }
  }, []);

  useEffect(() => {
    const syncOfflineSales = async () => {
      if (!navigator.onLine || offlineQueue.length === 0) return;

      for (const sale of offlineQueue) {
        try {
          await api.post("/sales", sale);
        } catch (err) {
          console.error("Failed to sync sale:", err);
        }
      }
      setOfflineQueue([]);
      localStorage.removeItem("offline_sales");
      showNotification("Offline sales synced", "success");
    };

    window.addEventListener("online", syncOfflineSales);
    return () => window.removeEventListener("online", syncOfflineSales);
  }, [offlineQueue]);

  /* ==================== CUSTOMER SEARCH ==================== */
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/customers/search", {
          params: { q: customerSearch },
        });
        setCustomerSuggestions(data);
      } catch {
        setCustomerSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  /* ==================== PRODUCT SEARCH ==================== */
  useEffect(() => {
    if (productSearch.length < 2) {
      setProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/inventory/search", {
          params: { q: productSearch, store: storeType },
        });
        setProducts(data);
      } catch {
        setProducts([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch, storeType]);

  /* ==================== SELECT CUSTOMER ==================== */
  const selectCustomer = (c: Customer) => {
    setCustomer({ ...c, isNew: false });
    setCustomerSearch("");
    setCustomerSuggestions([]);
  };

  /* ==================== COMPLETE SALE ==================== */
  const completeSale = async () => {
    if (cart.length === 0) {
      showNotification("Cart is empty", "error");
      return;
    }

    if (totalPaid < total) {
      showNotification("Payment insufficient", "error");
      return;
    }

    setIsProcessing(true);

    const payload = {
      storeType,
      items: cart.map((i) => ({
        productId: i._id,
        name: i.name,
        quantity: i.qty,
        unitPrice: i.price,
        total: i.price * i.qty,
      })),
      subtotal,
      tax,
      total,
      amountPaid: totalPaid,
      change,
      paymentMethod: getPaymentMethodString(),
      paymentDetails: {
        cash: paid.cash,
        momo: paid.momo,
        card: paid.card,
      },
      customer: customer.name
        ? {
            customerId: customer._id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            isNew: customer.isNew,
          }
        : null,
    };

    try {
      const { data } = await api.post("/sales", payload);
      printReceipt(data);
      resetTransaction();
      showNotification("Sale completed successfully", "success");
    } catch (err: any) {
      if (!navigator.onLine) {
        const updated = [...offlineQueue, payload];
        setOfflineQueue(updated);
        localStorage.setItem("offline_sales", JSON.stringify(updated));
        showNotification("Offline: Sale queued for sync", "warning");
        resetTransaction();
      } else {
        showNotification(err.response?.data?.message || "Sale failed", "error");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /* ==================== GET PAYMENT METHOD STRING ==================== */
  const getPaymentMethodString = () => {
    const methods = [];
    if (paid.cash > 0) methods.push("CASH");
    if (paid.momo > 0) methods.push("MOMO");
    if (paid.card > 0) methods.push("CARD");
    return methods.join("+") || "CASH";
  };

  /* ==================== RESET TRANSACTION ==================== */
  const resetTransaction = () => {
    setCart([]);
    setPaid({ cash: 0, momo: 0, card: 0 });
    setCustomer({ name: "", phone: "", email: "", address: "" });
    setPaymentMethod("cash");
  };

  /* ==================== PRINT RECEIPT ==================== */
  const printReceipt = (sale: any) => {
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            width: 300px;
            padding: 10px;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h1 { font-size: 16px; margin-bottom: 5px; }
          .header p { font-size: 10px; color: #666; }
          .store-type {
            text-align: center;
            font-size: 11px;
            background: #f0f0f0;
            padding: 3px;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .customer { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
          .customer p { font-size: 11px; }
          .items { margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .item-name { flex: 1; }
          .item-qty { width: 40px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          .totals { border-top: 1px dashed #000; padding-top: 10px; margin-bottom: 10px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row.grand { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .payment { border-top: 1px dashed #000; padding-top: 10px; margin-bottom: 10px; }
          .footer { text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          .footer p { margin-bottom: 3px; }
          @media print { body { width: 80mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PharmacyPOS</h1>
          <p>Receipt #${sale._id?.slice(-8).toUpperCase() || 'N/A'}</p>
          <p>${new Date().toLocaleString()}</p>
        </div>

        <div class="store-type">${storeType === 'pharmacy' ? 'Pharmacy' : 'General Store'}</div>

        ${sale.customer ? `
        <div class="customer">
          <p><strong>Customer:</strong> ${sale.customer.name}</p>
          ${sale.customer.phone ? `<p><strong>Phone:</strong> ${sale.customer.phone}</p>` : ''}
        </div>
        ` : ''}

        <div class="items">
          <div class="item" style="font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 8px; padding-bottom: 3px;">
            <span class="item-name">Item</span>
            <span class="item-qty">Qty</span>
            <span class="item-price">Amount</span>
          </div>
          ${sale.items?.map((i: any) => `
            <div class="item">
              <span class="item-name">${i.name}</span>
              <span class="item-qty">x${i.quantity}</span>
              <span class="item-price">₵${(i.total || i.unitPrice * i.quantity).toFixed(2)}</span>
            </div>
          `).join('') || ''}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₵${(sale.subtotal || subtotal).toFixed(2)}</span>
          </div>
          ${sale.tax > 0 ? `
          <div class="total-row">
            <span>Tax:</span>
            <span>₵${sale.tax.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>₵${(sale.total || total).toFixed(2)}</span>
          </div>
        </div>

        <div class="payment">
          <div class="total-row">
            <span>Paid (${sale.paymentMethod || getPaymentMethodString()}):</span>
            <span>₵${(sale.amountPaid || totalPaid).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Change:</span>
            <span>₵${(sale.change || change).toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Please come again</p>
          <p style="margin-top: 10px;">━━━━━━━━━━━━━━━━━━━━</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "PRINT", "height=600,width=400");
    if (!printWindow) return;
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  /* ==================== NOTIFICATION ==================== */
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "warning") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  /* ==================== QUICK AMOUNT BUTTONS ==================== */
  const quickAmounts = [10, 20, 50, 100, 200];

  const applyQuickAmount = (amount: number) => {
    if (paymentMethod === "cash") {
      setPaid((p) => ({ ...p, cash: p.cash + amount }));
    } else if (paymentMethod === "momo") {
      setPaid((p) => ({ ...p, momo: p.momo + amount }));
    } else if (paymentMethod === "card") {
      setPaid((p) => ({ ...p, card: p.card + amount }));
    }
  };

  const applyExactAmount = () => {
    const remaining = total - totalPaid;
    if (remaining <= 0) return;

    if (paymentMethod === "cash") {
      setPaid((p) => ({ ...p, cash: p.cash + remaining }));
    } else if (paymentMethod === "momo") {
      setPaid((p) => ({ ...p, momo: p.momo + remaining }));
    } else if (paymentMethod === "card") {
      setPaid((p) => ({ ...p, card: p.card + remaining }));
    }
  };

  /* ==================== RENDER ==================== */
  return (
    <div className="flex h-screen bg-[#F4F7F6]">
      {/* ==================== MAIN AREA ==================== */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <header className="bg-white shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold text-[#124170]">
                  Welcome, <span className="text-[#67C090]">{firstName}</span>
                </h1>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              {/* Store Type Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setStoreType("pharmacy")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    storeType === "pharmacy"
                      ? "bg-[#124170] text-white shadow-sm"
                      : "text-gray-600 hover:text-[#124170]"
                  }`}
                >
                  Pharmacy
                </button>
                <button
                  onClick={() => setStoreType("general")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    storeType === "general"
                      ? "bg-[#67C090] text-white shadow-sm"
                      : "text-gray-600 hover:text-[#67C090]"
                  }`}
                >
                  General Store
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Offline indicator */}
              {offlineQueue.length > 0 && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  {offlineQueue.length} pending sync
                </span>
              )}

              {/* Online/Offline status */}
              <span
                className={`w-3 h-3 rounded-full ${
                  navigator.onLine ? "bg-green-500" : "bg-red-500"
                }`}
                title={navigator.onLine ? "Online" : "Offline"}
              />
            </div>
          </div>
        </header>

        {/* PRODUCT SEARCH & CART */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Search & Products */}
          <div className="w-96 border-r bg-white flex flex-col">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products or scan barcode..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowProductSearch(true);
                  }}
                  onFocus={() => setShowProductSearch(true)}
                  className="w-full border rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090] focus:border-transparent"
                />
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Product Suggestions */}
              {showProductSearch && products.length > 0 && (
                <div className="absolute z-20 w-80 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => addToCart(p)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500">
                          Stock: {p.stock} | {p.barcode}
                        </p>
                      </div>
                      <span className="font-semibold text-[#124170]">
                        ₵{p.price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Section */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Customer</h3>
                {customer.name && (
                  <button
                    onClick={() =>
                      setCustomer({ name: "", phone: "", email: "", address: "" })
                    }
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {customer.name ? (
                <div className="bg-white rounded-lg p-3 border">
                  <p className="font-medium text-[#124170]">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                  )}
                  {customer.email && (
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    />

                    {/* Customer Suggestions */}
                    {customerSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerSuggestions.map((c) => (
                          <button
                            key={c._id}
                            onClick={() => selectCustomer(c)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b last:border-b-0"
                          >
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowCustomerForm(true)}
                    className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#67C090] hover:text-[#67C090] transition"
                  >
                    + Add New Customer
                  </button>
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>Scan barcode or search to add items</p>
              <p className="mt-1 text-xs">
                Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">F2</kbd> for
                product search
              </p>
            </div>
          </div>

          {/* RIGHT: Cart */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Cart Header */}
            <div className="px-6 py-4 bg-white border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-[#124170]">Shopping Cart</h2>
                <span className="px-2 py-1 bg-[#DDF4E7] text-[#124170] rounded-full text-xs font-medium">
                  {cartItemCount} items
                </span>
              </div>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Cart
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg
                    className="w-16 h-16 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium">Cart is empty</p>
                  <p className="text-sm">Scan or search products to add</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item._id}
                      className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-[#124170] truncate">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ₵{item.price.toFixed(2)} each
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-gray-100 rounded-lg">
                            <button
                              onClick={() => updateQty(item._id, -1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#124170] hover:bg-gray-200 rounded-l-lg transition"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-medium">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item._id, 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#124170] hover:bg-gray-200 rounded-r-lg transition"
                            >
                              +
                            </button>
                          </div>

                          {/* Item Total */}
                          <div className="w-24 text-right">
                            <p className="font-semibold text-[#124170]">
                              ₵{(item.price * item.qty).toFixed(2)}
                            </p>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== PAYMENT SIDEBAR ==================== */}
      <div className="w-96 bg-white border-l flex flex-col">
        {/* Order Summary */}
        <div className="p-6 border-b">
          <h2 className="font-semibold text-[#124170] mb-4">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">₵{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium">₵{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-[#124170]">₵{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="p-6 border-b flex-1 overflow-y-auto">
          <h3 className="font-medium text-gray-700 mb-4">Payment Method</h3>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {(["cash", "momo", "card", "split"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition border ${
                  paymentMethod === method
                    ? "bg-[#124170] text-white border-[#124170]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#124170]"
                }`}
              >
                {method === "cash" && "Cash"}
                {method === "momo" && "Mobile Money"}
                {method === "card" && "Card"}
                {method === "split" && "Split Payment"}
              </button>
            ))}
          </div>

          {/* Payment Inputs */}
          <div className="space-y-4">
            {(paymentMethod === "cash" || paymentMethod === "split") && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Cash Amount
                </label>
                <input
                  type="number"
                  value={paid.cash || ""}
                  onChange={(e) =>
                    setPaid({ ...paid, cash: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full border rounded-lg px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                />
              </div>
            )}

            {(paymentMethod === "momo" || paymentMethod === "split") && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Mobile Money Amount
                </label>
                <input
                  type="number"
                  value={paid.momo || ""}
                  onChange={(e) =>
                    setPaid({ ...paid, momo: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full border rounded-lg px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                />
              </div>
            )}

            {(paymentMethod === "card" || paymentMethod === "split") && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Card Amount
                </label>
                <input
                  type="number"
                  value={paid.card || ""}
                  onChange={(e) =>
                    setPaid({ ...paid, card: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full border rounded-lg px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                />
              </div>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => applyQuickAmount(amt)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                >
                  +₵{amt}
                </button>
              ))}
              <button
                onClick={applyExactAmount}
                className="px-3 py-1.5 bg-[#DDF4E7] hover:bg-[#c5e8d4] text-[#124170] rounded-lg text-sm font-medium transition"
              >
                Exact
              </button>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-medium">₵{totalPaid.toFixed(2)}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Balance Due</span>
                <span className="font-medium">₵{balance.toFixed(2)}</span>
              </div>
            )}
            {change > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Change</span>
                <span className="font-medium">₵{change.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Complete Sale Button */}
        <div className="p-6">
          <button
            onClick={completeSale}
            disabled={cart.length === 0 || totalPaid < total || isProcessing}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition ${
              cart.length === 0 || totalPaid < total || isProcessing
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#67C090] hover:bg-[#52a377] text-white"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              `Complete Sale • ₵${total.toFixed(2)}`
            )}
          </button>

          {cart.length > 0 && totalPaid < total && (
            <p className="text-center text-sm text-red-500 mt-2">
              Please enter payment amount
            </p>
          )}
        </div>
      </div>

      {/* ==================== NEW CUSTOMER MODAL ==================== */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 bg-[#124170] text-white">
              <h2 className="text-lg font-semibold">New Customer</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value, isNew: true })
                  }
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  placeholder="e.g., 0241234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (Optional)
                </label>
                <textarea
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  rows={2}
                  placeholder="Customer address"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowCustomerForm(false);
                  setCustomer({ name: "", phone: "", email: "", address: "" });
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!customer.name || !customer.phone) {
                    showNotification("Name and phone are required", "error");
                    return;
                  }
                  setCustomer({ ...customer, isNew: true });
                  setShowCustomerForm(false);
                }}
                className="flex-1 px-4 py-2.5 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== NOTIFICATION ==================== */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-in ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : notification.type === "error"
              ? "bg-red-500 text-white"
              : "bg-yellow-500 text-white"
          }`}
        >
          {notification.type === "success" && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {notification.type === "error" && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {notification.type === "warning" && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
