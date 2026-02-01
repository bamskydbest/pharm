import { useEffect, useRef, useState } from "react";
import api from "../components/services/api";

type CartItem = {
  _id: string;
  name: string;
  price: number;
  qty: number;
  stock?: number;
};

type PaymentSplit = {
  cash: number;
  momo: number;
};

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paid, setPaid] = useState<PaymentSplit>({ cash: 0, momo: 0 });
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const barcodeBuffer = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------ TOTALS ------------------ */
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalPaid = paid.cash + paid.momo;
  const change = totalPaid > total ? totalPaid - total : 0;

  /* ------------------ BARCODE SCAN ------------------ */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (barcodeTimer.current) clearTimeout(barcodeTimer.current);

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 3) addByBarcode(barcodeBuffer.current);
        barcodeBuffer.current = "";
        return;
      }

      if (/^[a-zA-Z0-9]$/.test(e.key)) barcodeBuffer.current += e.key;

      barcodeTimer.current = setTimeout(() => {
        barcodeBuffer.current = "";
      }, 120);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ------------------ ADD ITEM BY BARCODE ------------------ */
  const addByBarcode = async (code: string) => {
    try {
      const { data } = await api.get(`/inventory/barcode/${code}`);
      setCart((prev) => {
        const existing = prev.find((i) => i._id === data._id);
        if (existing) {
          return prev.map((i) =>
            i._id === data._id ? { ...i, qty: Math.min(i.stock || Infinity, i.qty + 1) } : i
          );
        }
        return [...prev, { ...data, qty: 1 }];
      });
    } catch {
      alert("Product not found");
    }
  };

  /* ------------------ UPDATE QUANTITY ------------------ */
  const updateQty = (_id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => ({
          ...i,
          qty: Math.min(Math.max(1, i.qty + delta), i.stock ?? Infinity),
        }))
        .filter((i) => i.qty > 0)
    );
  };

  /* ------------------ OFFLINE QUEUE SYNC ------------------ */
  useEffect(() => {
    const syncOfflineSales = async () => {
      if (!navigator.onLine || offlineQueue.length === 0) return;
      for (const sale of offlineQueue) await api.post("/sales", sale);
      setOfflineQueue([]);
      localStorage.removeItem("offline_sales");
    };

    window.addEventListener("online", syncOfflineSales);
    return () => window.removeEventListener("online", syncOfflineSales);
  }, [offlineQueue]);

  /* ------------------ COMPLETE SALE ------------------ */
  const completeSale = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (totalPaid < total) return alert("Payment insufficient");

    const payload = {
      items: cart.map((i) => ({ productId: i._id, name: i.name, quantity: i.qty, unitPrice: i.price })),
      amountPaid: totalPaid,
      paymentMethod:
        paid.cash > 0 && paid.momo > 0 ? "CASH+MOMO" : paid.cash > 0 ? "CASH" : "MOMO",
    };

    try {
      const { data } = await api.post("/sales", payload);
      printReceipt(data);
      setCart([]);
      setPaid({ cash: 0, momo: 0 });
    } catch (err: any) {
      if (!navigator.onLine) {
        const updated = [...offlineQueue, payload];
        setOfflineQueue(updated);
        localStorage.setItem("offline_sales", JSON.stringify(updated));
        alert("Offline: Sale queued");
      } else {
        alert(err.response?.data?.message || "Sale failed");
      }
    }
  };

  /* ------------------ PRINT RECEIPT ------------------ */
  const printReceipt = (sale: any) => {
    const receipt = `
PHARMACY RECEIPT
------------------------
${sale.items.map((i: any) => `${i.name} x${i.quantity} ₵${i.total}`).join("\n")}
------------------------
TOTAL: ₵${sale.subtotal}
PAID: ₵${sale.amountPaid}
CHANGE: ₵${sale.change}
------------------------
THANK YOU
`;
    const win = window.open("", "PRINT", "height=600,width=400");
    if (!win) return;
    win.document.write(`<pre>${receipt}</pre>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  /* ------------------ UI ------------------ */
  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* CART */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="font-bold text-2xl mb-4">POS</h1>

        {cart.length === 0 && <p className="text-gray-500">Scan items to add to cart</p>}

        {cart.map((i) => (
          <div
            key={i._id}
            className="flex justify-between items-center border-b py-2"
          >
            <span>{i.name}</span>
            <div className="flex gap-2 items-center">
              <button
                className="px-2 py-1 bg-gray-200 rounded"
                onClick={() => updateQty(i._id, -1)}
              >
                -
              </button>
              <span>{i.qty}</span>
              <button
                className="px-2 py-1 bg-gray-200 rounded"
                onClick={() => updateQty(i._id, 1)}
              >
                +
              </button>
            </div>
            <span>₵{i.price * i.qty}</span>
          </div>
        ))}
      </div>

      {/* PAYMENT */}
      <div className="lg:w-80 p-4 bg-gray-100 flex-shrink-0">
        <p className="font-semibold text-lg">Total: ₵{total}</p>

        <input
          className="border p-2 w-full mt-3 rounded"
          placeholder="Cash Paid"
          type="number"
          min={0}
          value={paid.cash}
          onChange={(e) => setPaid({ ...paid, cash: +e.target.value })}
        />

        <input
          className="border p-2 w-full mt-3 rounded"
          placeholder="MOMO Paid"
          type="number"
          min={0}
          value={paid.momo}
          onChange={(e) => setPaid({ ...paid, momo: +e.target.value })}
        />

        <p className="mt-3 font-medium">Change: ₵{change}</p>

        <button
          className="mt-4 bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded transition"
          onClick={completeSale}
        >
          Complete Sale
        </button>
      </div>
    </div>
  );
}
