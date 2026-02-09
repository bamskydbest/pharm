import React, { useEffect, useRef, useState, useMemo } from "react";
import api from "../components/services/api";
import { useAuthStore } from "../components/store/authStore";

type InventoryItem = {
  _id: string;
  barcode: string;
  name: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  batchNumber: string;
  expiryDate: string;
  manufacturer: string;
  supplier: string;
  reorderLevel: number;
  location: string;
  status: "active" | "discontinued";
  createdAt: string;
  updatedAt: string;
};

type StockMovement = {
  _id: string;
  productId: string;
  productName: string;
  type: "in" | "out" | "adjustment" | "return";
  quantity: number;
  batchNumber: string;
  reason: string;
  performedBy: string;
  createdAt: string;
};

type ExpiryAlert = {
  _id: string;
  name: string;
  barcode: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  status: "expired" | "critical" | "warning" | "safe";
};

type Category = {
  _id: string;
  name: string;
  count: number;
};

type StockReportItem = {
  _id: string;
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  openingStock: {
    qty: number;
    amount: number;
  };
  purchases: {
    qty: number;
    amount: number;
  };
  balance: {
    qty: number;
    amount: number;
  };
  consumption: {
    qty: number;
    amount: number;
  };
  closingStock: {
    qty: number;
    amount: number;
  };
};

type StockReportSummary = {
  totalOpeningValue: number;
  totalPurchasesValue: number;
  totalBalanceValue: number;
  totalConsumptionValue: number;
  totalClosingValue: number;
  totalOpeningQty: number;
  totalPurchasesQty: number;
  totalBalanceQty: number;
  totalConsumptionQty: number;
  totalClosingQty: number;
};

type Tab = "inventory" | "stock-in" | "alerts" | "history" | "stock-report";
type SortField = "name" | "quantity" | "expiryDate" | "sellingPrice" | "category";
type SortOrder = "asc" | "desc";

export default function Inventory() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "User";
  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [loading, setLoading] = useState(true);

  // Inventory data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Stock Report data
  const [stockReport, setStockReport] = useState<StockReportItem[]>([]);
  const [stockReportSummary, setStockReportSummary] = useState<StockReportSummary>({
    totalOpeningValue: 0,
    totalPurchasesValue: 0,
    totalBalanceValue: 0,
    totalConsumptionValue: 0,
    totalClosingValue: 0,
    totalOpeningQty: 0,
    totalPurchasesQty: 0,
    totalBalanceQty: 0,
    totalConsumptionQty: 0,
    totalClosingQty: 0,
  });
  const [reportDateRange, setReportDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportCategory, setReportCategory] = useState("");

  // Product detail modal for stock report
  const [selectedReportProduct, setSelectedReportProduct] = useState<StockReportItem | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [productMovementsLoading, setProductMovementsLoading] = useState(false);

  // Summary stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStock: 0,
    expiringSoon: 0,
    expired: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Stock-in form
  const [barcode, setBarcode] = useState("");
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [stockForm, setStockForm] = useState({
    name: "",
    category: "",
    manufacturer: "",
    supplier: "",
    quantity: "",
    costPrice: "",
    sellingPrice: "",
    batchNumber: "",
    expiryDate: "",
    reorderLevel: "10",
    location: "",
  });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Stock adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    type: "in" as "in" | "out" | "adjustment",
    quantity: "",
    reason: "",
  });

  // Refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notification
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  /* ==================== FETCH DATA ==================== */
  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchExpiryAlerts();
    fetchStats();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get<InventoryItem[]>("/inventory");
      setItems(res.data);
    } catch (err) {
      showNotification("Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get<Category[]>("/inventory/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to load categories");
    }
  };

  const fetchExpiryAlerts = async () => {
    try {
      const res = await api.get<ExpiryAlert[]>("/inventory/expiry-alerts");
      setExpiryAlerts(res.data);
    } catch (err) {
      console.error("Failed to load expiry alerts");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/inventory/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load stats");
    }
  };

  const fetchStockHistory = async () => {
    try {
      const res = await api.get<StockMovement[]>("/inventory/stock-history");
      setStockHistory(res.data);
    } catch (err) {
      console.error("Failed to load stock history");
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchStockHistory();
    }
    if (activeTab === "stock-report") {
      fetchStockReport();
    }
  }, [activeTab]);

  // Auto-refresh stock report when date range changes
  useEffect(() => {
    if (activeTab === "stock-report") {
      fetchStockReport();
    }
  }, [reportDateRange]);

  // Auto-refresh stock report every 30 seconds when on that tab
  useEffect(() => {
    if (activeTab !== "stock-report") return;

    const interval = setInterval(() => {
      fetchStockReport();
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, reportDateRange]);

  const fetchStockReport = async () => {
    try {
      setReportLoading(true);
      const res = await api.get<{ report: StockReportItem[]; summary: StockReportSummary }>(
        "/inventory/stock-report",
        {
          params: {
            from: reportDateRange.from,
            to: reportDateRange.to,
          },
        }
      );
      setStockReport(res.data.report);
      setStockReportSummary(res.data.summary);
    } catch (err) {
      // If API not available, calculate from local data
      calculateLocalStockReport();
    } finally {
      setReportLoading(false);
    }
  };

  // Fallback: Calculate stock report from local inventory and history data
  const calculateLocalStockReport = async () => {
    try {
      // Fetch all needed data
      const [inventoryRes, historyRes] = await Promise.all([
        api.get<InventoryItem[]>("/inventory"),
        api.get<StockMovement[]>("/inventory/stock-history", {
          params: { from: reportDateRange.from, to: reportDateRange.to },
        }),
      ]);

      const inventory = inventoryRes.data;
      const history = historyRes.data;

      // Build report from inventory items
      const reportItems: StockReportItem[] = inventory.map((item) => {
        // Get movements for this product in the date range
        const productMovements = history.filter((h) => h.productId === item._id);

        // Calculate purchases (stock in) during period
        const purchasesQty = productMovements
          .filter((m) => m.type === "in")
          .reduce((sum, m) => sum + m.quantity, 0);

        // Calculate consumption (stock out + sales) during period
        const consumptionQty = productMovements
          .filter((m) => m.type === "out" || m.type === "adjustment")
          .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

        // Current stock is the closing stock
        const closingQty = item.quantity;

        // Opening stock = Closing - Purchases + Consumption
        const openingQty = closingQty - purchasesQty + consumptionQty;

        // Balance = Opening + Purchases
        const balanceQty = openingQty + purchasesQty;

        return {
          _id: item._id,
          barcode: item.barcode,
          name: item.name,
          category: item.category,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          openingStock: {
            qty: Math.max(0, openingQty),
            amount: Math.max(0, openingQty) * item.costPrice,
          },
          purchases: {
            qty: purchasesQty,
            amount: purchasesQty * item.costPrice,
          },
          balance: {
            qty: Math.max(0, balanceQty),
            amount: Math.max(0, balanceQty) * item.costPrice,
          },
          consumption: {
            qty: consumptionQty,
            amount: consumptionQty * item.sellingPrice,
          },
          closingStock: {
            qty: closingQty,
            amount: closingQty * item.costPrice,
          },
        };
      });

      // Calculate summary
      const summary: StockReportSummary = {
        totalOpeningQty: reportItems.reduce((sum, r) => sum + r.openingStock.qty, 0),
        totalOpeningValue: reportItems.reduce((sum, r) => sum + r.openingStock.amount, 0),
        totalPurchasesQty: reportItems.reduce((sum, r) => sum + r.purchases.qty, 0),
        totalPurchasesValue: reportItems.reduce((sum, r) => sum + r.purchases.amount, 0),
        totalBalanceQty: reportItems.reduce((sum, r) => sum + r.balance.qty, 0),
        totalBalanceValue: reportItems.reduce((sum, r) => sum + r.balance.amount, 0),
        totalConsumptionQty: reportItems.reduce((sum, r) => sum + r.consumption.qty, 0),
        totalConsumptionValue: reportItems.reduce((sum, r) => sum + r.consumption.amount, 0),
        totalClosingQty: reportItems.reduce((sum, r) => sum + r.closingStock.qty, 0),
        totalClosingValue: reportItems.reduce((sum, r) => sum + r.closingStock.amount, 0),
      };

      setStockReport(reportItems);
      setStockReportSummary(summary);
    } catch (err) {
      console.error("Failed to calculate stock report:", err);
    }
  };

  // Fetch individual product stock movements
  const fetchProductMovements = async (productId: string) => {
    try {
      setProductMovementsLoading(true);
      const res = await api.get<StockMovement[]>(`/inventory/stock-history/${productId}`, {
        params: {
          from: reportDateRange.from,
          to: reportDateRange.to,
        },
      });
      setProductMovements(res.data);
    } catch (err) {
      // Fallback: filter from existing stock history
      const filtered = stockHistory.filter((m) => m.productId === productId);
      setProductMovements(filtered);
    } finally {
      setProductMovementsLoading(false);
    }
  };

  // Open product detail modal
  const openProductDetail = (product: StockReportItem) => {
    setSelectedReportProduct(product);
    fetchProductMovements(product._id);
  };

  /* ==================== BARCODE SCANNING ==================== */
  useEffect(() => {
    if (activeTab !== "stock-in") return;

    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (barcodeTimer.current) clearTimeout(barcodeTimer.current);

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 3) {
          setBarcode(barcodeBuffer.current);
          handleBarcodeScan(barcodeBuffer.current);
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
  }, [activeTab]);

  const handleBarcodeScan = async (code: string) => {
    if (!code.trim()) return;

    try {
      const res = await api.get(`/inventory/scan/${code}`);
      if (res.data.exists) {
        setScannedProduct(res.data.product);
        setIsNewProduct(false);
        setStockForm((prev) => ({
          ...prev,
          name: res.data.product.name,
          category: res.data.product.category,
          manufacturer: res.data.product.manufacturer || "",
          supplier: res.data.product.supplier || "",
          costPrice: res.data.product.costPrice?.toString() || "",
          sellingPrice: res.data.product.sellingPrice?.toString() || "",
          reorderLevel: res.data.product.reorderLevel?.toString() || "10",
          location: res.data.product.location || "",
        }));
        showNotification(`Product found: ${res.data.product.name}`, "success");
      } else {
        setScannedProduct(null);
        setIsNewProduct(true);
        setStockForm({
          name: "",
          category: "",
          manufacturer: "",
          supplier: "",
          quantity: "",
          costPrice: "",
          sellingPrice: "",
          batchNumber: "",
          expiryDate: "",
          reorderLevel: "10",
          location: "",
        });
        showNotification("New product - Enter details below", "warning");
      }
    } catch (err) {
      setScannedProduct(null);
      setIsNewProduct(true);
      showNotification("Product not found - Enter as new", "warning");
    }
  };

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBarcodeScan(barcode);
    }
  };

  /* ==================== STOCK IN ==================== */
  const handleStockIn = async () => {
    if (!barcode.trim()) {
      showNotification("Please scan or enter a barcode", "error");
      return;
    }

    if (!stockForm.name.trim()) {
      showNotification("Product name is required", "error");
      return;
    }

    if (!stockForm.quantity || parseInt(stockForm.quantity) <= 0) {
      showNotification("Enter a valid quantity", "error");
      return;
    }

    if (!stockForm.costPrice || parseFloat(stockForm.costPrice) <= 0) {
      showNotification("Enter a valid cost price", "error");
      return;
    }

    if (!stockForm.sellingPrice || parseFloat(stockForm.sellingPrice) <= 0) {
      showNotification("Enter a valid selling price", "error");
      return;
    }

    if (!stockForm.batchNumber.trim()) {
      showNotification("Batch number is required", "error");
      return;
    }

    if (!stockForm.expiryDate) {
      showNotification("Expiry date is required", "error");
      return;
    }

    try {
      await api.post("/inventory/stock-in", {
        barcode,
        name: stockForm.name,
        category: stockForm.category,
        manufacturer: stockForm.manufacturer,
        supplier: stockForm.supplier,
        quantity: parseInt(stockForm.quantity),
        costPrice: parseFloat(stockForm.costPrice),
        sellingPrice: parseFloat(stockForm.sellingPrice),
        batchNumber: stockForm.batchNumber,
        expiryDate: new Date(stockForm.expiryDate),
        reorderLevel: parseInt(stockForm.reorderLevel) || 10,
        location: stockForm.location,
        isNewProduct,
      });

      showNotification("Stock added successfully", "success");
      resetStockForm();
      fetchInventory();
      fetchStats();
      fetchExpiryAlerts();
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      showNotification(err.response?.data?.message || "Failed to add stock", "error");
    }
  };

  const resetStockForm = () => {
    setBarcode("");
    setScannedProduct(null);
    setIsNewProduct(false);
    setStockForm({
      name: "",
      category: "",
      manufacturer: "",
      supplier: "",
      quantity: "",
      costPrice: "",
      sellingPrice: "",
      batchNumber: "",
      expiryDate: "",
      reorderLevel: "10",
      location: "",
    });
  };

  /* ==================== STOCK ADJUSTMENT ==================== */
  const handleStockAdjustment = async () => {
    if (!adjustItem || !adjustForm.quantity || !adjustForm.reason) {
      showNotification("Please fill all fields", "error");
      return;
    }

    try {
      await api.post("/inventory/adjust", {
        productId: adjustItem._id,
        type: adjustForm.type,
        quantity: parseInt(adjustForm.quantity),
        reason: adjustForm.reason,
      });

      showNotification("Stock adjusted successfully", "success");
      setShowAdjustModal(false);
      setAdjustItem(null);
      setAdjustForm({ type: "in", quantity: "", reason: "" });
      fetchInventory();
      fetchStats();
    } catch (err: any) {
      showNotification(err.response?.data?.message || "Adjustment failed", "error");
    }
  };

  /* ==================== EDIT PRODUCT ==================== */
  const handleUpdateProduct = async () => {
    if (!editingItem) return;

    try {
      await api.put(`/inventory/${editingItem._id}`, editingItem);
      showNotification("Product updated successfully", "success");
      setShowEditModal(false);
      setEditingItem(null);
      fetchInventory();
    } catch (err: any) {
      showNotification(err.response?.data?.message || "Update failed", "error");
    }
  };

  /* ==================== DELETE PRODUCT ==================== */
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await api.delete(`/inventory/${id}`);
      showNotification("Product deleted", "success");
      fetchInventory();
      fetchStats();
    } catch (err: any) {
      showNotification(err.response?.data?.message || "Delete failed", "error");
    }
  };

  /* ==================== FILTER & SORT ==================== */
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.barcode.toLowerCase().includes(query) ||
          item.batchNumber?.toLowerCase().includes(query) ||
          item.manufacturer?.toLowerCase().includes(query)
      );
    }

    if (filterCategory) {
      result = result.filter((item) => item.category === filterCategory);
    }

    if (filterStatus) {
      result = result.filter((item) => item.status === filterStatus);
    }

    if (showLowStock) {
      result = result.filter((item) => item.quantity <= (item.reorderLevel || 10));
    }

    if (showExpiring) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      result = result.filter(
        (item) => item.expiryDate && new Date(item.expiryDate) <= thirtyDaysFromNow
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "expiryDate":
          comparison =
            new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          break;
        case "sellingPrice":
          comparison = a.sellingPrice - b.sellingPrice;
          break;
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, filterCategory, filterStatus, showLowStock, showExpiring, sortField, sortOrder]);

  // Filter stock report items
  const filteredStockReport = useMemo(() => {
    let result = [...stockReport];

    if (reportSearch) {
      const search = reportSearch.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.barcode.toLowerCase().includes(search)
      );
    }

    if (reportCategory) {
      result = result.filter((item) => item.category === reportCategory);
    }

    return result;
  }, [stockReport, reportSearch, reportCategory]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterStatus, showLowStock, showExpiring]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  /* ==================== EXPORT ==================== */
  const exportToCSV = () => {
    const headers = [
      "Barcode",
      "Name",
      "Category",
      "Quantity",
      "Cost Price",
      "Selling Price",
      "Batch",
      "Expiry Date",
      "Manufacturer",
      "Supplier",
      "Location",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredItems.map((item) =>
        [
          item.barcode,
          `"${item.name}"`,
          item.category,
          item.quantity,
          item.costPrice,
          item.sellingPrice,
          item.batchNumber,
          item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "",
          `"${item.manufacturer || ""}"`,
          `"${item.supplier || ""}"`,
          `"${item.location || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /* ==================== HELPERS ==================== */
  const showNotification = (message: string, type: "success" | "error" | "warning") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) return { status: "expired", color: "bg-red-100 text-red-700", text: "Expired" };
    if (daysUntil <= 30) return { status: "critical", color: "bg-orange-100 text-orange-700", text: `${daysUntil}d` };
    if (daysUntil <= 90) return { status: "warning", color: "bg-yellow-100 text-yellow-700", text: `${daysUntil}d` };
    return { status: "safe", color: "bg-green-100 text-green-700", text: `${daysUntil}d` };
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) return { color: "bg-red-100 text-red-700", text: "Out of Stock" };
    if (item.quantity <= (item.reorderLevel || 10)) return { color: "bg-orange-100 text-orange-700", text: "Low Stock" };
    return { color: "bg-green-100 text-green-700", text: "In Stock" };
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  const tabs: { id: Tab; label: string; shortLabel: string; icon: React.ReactElement }[] = [
    {
      id: "inventory",
      label: "Inventory",
      shortLabel: "Stock",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "stock-in",
      label: "Stock In",
      shortLabel: "Add",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      id: "alerts",
      label: "Expiry Alerts",
      shortLabel: "Alerts",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: "history",
      label: "Stock History",
      shortLabel: "History",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "stock-report",
      label: "Stock Report",
      shortLabel: "Report",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  /* ==================== RENDER ==================== */
  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      <main className="px-3 sm:px-4 lg:px-6 py-4 lg:py-6 max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#124170]">
              Welcome, <span className="text-[#67C090]">{firstName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Quick Stats - Horizontal scroll on mobile */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="px-3 py-2 bg-white rounded-lg shadow-sm border flex-shrink-0 min-w-[80px]">
              <span className="text-[10px] sm:text-xs text-gray-500 block">Products</span>
              <p className="text-base sm:text-lg font-bold text-[#124170]">{stats.totalProducts}</p>
            </div>
            <div className="px-3 py-2 bg-white rounded-lg shadow-sm border flex-shrink-0 min-w-[90px]">
              <span className="text-[10px] sm:text-xs text-gray-500 block">Value</span>
              <p className="text-base sm:text-lg font-bold text-[#124170]">₵{stats.totalValue.toLocaleString()}</p>
            </div>
            <div className="px-3 py-2 bg-orange-50 rounded-lg border border-orange-200 flex-shrink-0 min-w-[70px]">
              <span className="text-[10px] sm:text-xs text-orange-600 block">Low</span>
              <p className="text-base sm:text-lg font-bold text-orange-600">{stats.lowStock}</p>
            </div>
            <div className="px-3 py-2 bg-red-50 rounded-lg border border-red-200 flex-shrink-0 min-w-[80px]">
              <span className="text-[10px] sm:text-xs text-red-600 block">Expiring</span>
              <p className="text-base sm:text-lg font-bold text-red-600">{stats.expiringSoon + stats.expired}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b px-2 sm:px-4">
            <nav className="flex gap-1 sm:gap-2 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-[#124170] text-[#124170]"
                      : "border-transparent text-gray-500 hover:text-[#124170]"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {tab.id === "alerts" && (stats.expiringSoon + stats.expired) > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full">
                      {stats.expiringSoon + stats.expired}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3 sm:p-4 lg:p-6">
            {/* ==================== INVENTORY TAB ==================== */}
            {activeTab === "inventory" && (
              <div className="space-y-4">
                {/* Search and Filter Toggle */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by name, barcode, batch..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition ${
                        showFilters ? "bg-[#124170] text-white" : "hover:bg-gray-50"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <span className="hidden sm:inline">Filters</span>
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-4 py-2.5 border border-[#124170] text-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span className="hidden sm:inline">Export</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Category</label>
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                        >
                          <option value="">All Categories</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat.name}>
                              {cat.name} ({cat.count})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Items per page</label>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => setItemsPerPage(Number(e.target.value))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                        >
                          <option value={20}>20 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showLowStock}
                            onChange={(e) => setShowLowStock(e.target.checked)}
                            className="rounded border-gray-300 text-[#67C090] focus:ring-[#67C090]"
                          />
                          <span className="text-orange-600">Low Stock Only</span>
                        </label>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showExpiring}
                            onChange={(e) => setShowExpiring(e.target.checked)}
                            className="rounded border-gray-300 text-[#67C090] focus:ring-[#67C090]"
                          />
                          <span className="text-red-600">Expiring Soon</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results count */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                  <span>
                    {filteredItems.length > 0 ? (
                      <>
                        {((currentPage - 1) * itemsPerPage) + 1}-
                        {Math.min(currentPage * itemsPerPage, filteredItems.length)} of{" "}
                        {filteredItems.length}
                      </>
                    ) : (
                      "0 products"
                    )}
                  </span>
                </div>

                {/* Table / Cards */}
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Loading inventory...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-base sm:text-lg font-medium">No products found</p>
                    <p className="text-xs sm:text-sm">Try adjusting your filters or add new stock</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden space-y-3">
                      {paginatedItems.map((item) => {
                        const expiryInfo = getExpiryStatus(item.expiryDate);
                        const stockStatus = getStockStatus(item);

                        return (
                          <div key={item._id} className="bg-white border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#124170] truncate">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.barcode}</p>
                              </div>
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${stockStatus.color}`}>
                                {item.quantity} units
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs">
                              {item.category && (
                                <span className="px-2 py-1 bg-gray-100 rounded">{item.category}</span>
                              )}
                              {expiryInfo && (
                                <span className={`px-2 py-1 rounded ${expiryInfo.color}`}>
                                  {expiryInfo.text}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                ₵{item.sellingPrice?.toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t">
                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setShowAdjustModal(true);
                                }}
                                className="flex-1 py-2 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItem({ ...item });
                                  setShowEditModal(true);
                                }}
                                className="flex-1 py-2 text-xs text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(item._id)}
                                className="flex-1 py-2 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-[#124170] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th
                              className="px-4 py-3 text-left cursor-pointer hover:bg-[#0d2f52]"
                              onClick={() => handleSort("category")}
                            >
                              Category <SortIndicator field="category" />
                            </th>
                            <th
                              className="px-4 py-3 text-right cursor-pointer hover:bg-[#0d2f52]"
                              onClick={() => handleSort("quantity")}
                            >
                              Stock <SortIndicator field="quantity" />
                            </th>
                            <th
                              className="px-4 py-3 text-right cursor-pointer hover:bg-[#0d2f52]"
                              onClick={() => handleSort("sellingPrice")}
                            >
                              Price <SortIndicator field="sellingPrice" />
                            </th>
                            <th className="px-4 py-3 text-center">Batch</th>
                            <th
                              className="px-4 py-3 text-center cursor-pointer hover:bg-[#0d2f52]"
                              onClick={() => handleSort("expiryDate")}
                            >
                              Expiry <SortIndicator field="expiryDate" />
                            </th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedItems.map((item) => {
                            const expiryInfo = getExpiryStatus(item.expiryDate);
                            const stockStatus = getStockStatus(item);

                            return (
                              <tr key={item._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-[#124170]">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.barcode}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{item.category || "—"}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">
                                  ₵{item.sellingPrice?.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600 text-xs">
                                  {item.batchNumber || "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {expiryInfo ? (
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${expiryInfo.color}`}>
                                      {expiryInfo.text}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                    {stockStatus.text}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        setAdjustItem(item);
                                        setShowAdjustModal(true);
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                      title="Adjust Stock"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingItem({ ...item });
                                        setShowEditModal(true);
                                      }}
                                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                                      title="Edit"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(item._id)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                      title="Delete"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-full sm:w-auto px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-sm ${
                              currentPage === pageNum
                                ? "bg-[#124170] text-white"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="w-full sm:w-auto px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ==================== STOCK IN TAB ==================== */}
            {activeTab === "stock-in" && (
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                <div className="text-center mb-4 sm:mb-8">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#124170]">Stock In</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Scan barcode or enter manually to add stock
                  </p>
                </div>

                {/* Barcode Scanner */}
                <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border-2 border-dashed border-gray-300">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barcode / Product Code
                      </label>
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={handleBarcodeInput}
                        placeholder="Scan barcode or type and press Enter..."
                        className="w-full border-2 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#67C090] focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => handleBarcodeScan(barcode)}
                      className="px-6 py-2.5 sm:py-3 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition sm:mt-7"
                    >
                      Search
                    </button>
                  </div>

                  {scannedProduct && (
                    <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-700 font-medium text-sm sm:text-base">
                        Product Found: {scannedProduct.name}
                      </p>
                      <p className="text-green-600 text-xs sm:text-sm">
                        Current Stock: {scannedProduct.quantity} units
                      </p>
                    </div>
                  )}

                  {isNewProduct && (
                    <div className="mt-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-700 font-medium text-sm sm:text-base">
                        New Product - Please enter product details below
                      </p>
                    </div>
                  )}
                </div>

                {/* Stock Form */}
                {(scannedProduct || isNewProduct) && (
                  <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <h3 className="font-medium text-[#124170] border-b pb-3 text-sm sm:text-base">
                      {isNewProduct ? "New Product Details" : "Stock Details"}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Product Name */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          value={stockForm.name}
                          onChange={(e) =>
                            setStockForm({ ...stockForm, name: e.target.value })
                          }
                          disabled={!!scannedProduct}
                          className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090] disabled:bg-gray-100"
                          placeholder="Enter product name"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={stockForm.category}
                          onChange={(e) =>
                            setStockForm({ ...stockForm, category: e.target.value })
                          }
                          disabled={!!scannedProduct}
                          className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090] disabled:bg-gray-100"
                        >
                          <option value="">Select Category</option>
                          <option value="Tablets">Tablets</option>
                          <option value="Capsules">Capsules</option>
                          <option value="Syrups">Syrups</option>
                          <option value="Injections">Injections</option>
                          <option value="Creams">Creams</option>
                          <option value="Drops">Drops</option>
                          <option value="Medical Supplies">Medical Supplies</option>
                          <option value="Personal Care">Personal Care</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Manufacturer */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Manufacturer
                        </label>
                        <input
                          type="text"
                          value={stockForm.manufacturer}
                          onChange={(e) =>
                            setStockForm({ ...stockForm, manufacturer: e.target.value })
                          }
                          className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                          placeholder="e.g., Pfizer"
                        />
                      </div>

                      {/* Supplier */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Supplier
                        </label>
                        <input
                          type="text"
                          value={stockForm.supplier}
                          onChange={(e) =>
                            setStockForm({ ...stockForm, supplier: e.target.value })
                          }
                          className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                          placeholder="Supplier name"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Storage Location
                        </label>
                        <input
                          type="text"
                          value={stockForm.location}
                          onChange={(e) =>
                            setStockForm({ ...stockForm, location: e.target.value })
                          }
                          className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                          placeholder="e.g., Shelf A3"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4 sm:pt-6">
                      <h4 className="font-medium text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">Batch Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        {/* Quantity */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            value={stockForm.quantity}
                            onChange={(e) =>
                              setStockForm({ ...stockForm, quantity: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            placeholder="0"
                            min="1"
                          />
                        </div>

                        {/* Batch Number */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Batch Number *
                          </label>
                          <input
                            type="text"
                            value={stockForm.batchNumber}
                            onChange={(e) =>
                              setStockForm({ ...stockForm, batchNumber: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            placeholder="e.g., BAT-2024-001"
                          />
                        </div>

                        {/* Expiry Date */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Expiry Date *
                          </label>
                          <input
                            type="date"
                            value={stockForm.expiryDate}
                            onChange={(e) =>
                              setStockForm({ ...stockForm, expiryDate: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 sm:pt-6">
                      <h4 className="font-medium text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">Pricing</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        {/* Cost Price */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Cost Price (₵) *
                          </label>
                          <input
                            type="number"
                            value={stockForm.costPrice}
                            onChange={(e) =>
                              setStockForm({ ...stockForm, costPrice: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>

                        {/* Selling Price */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Selling Price (₵) *
                          </label>
                          <input
                            type="number"
                            value={stockForm.sellingPrice}
                            onChange={(e) =>
                              setStockForm({ ...stockForm, sellingPrice: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>

                        {/* Reorder Level */}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Reorder Level
                          </label>
                          <input
                            type="number"
                            value={stockForm.reorderLevel}
                            onChange={(e) =>
                              setStockForm({ ...stockForm, reorderLevel: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            placeholder="10"
                          />
                        </div>
                      </div>

                      {/* Profit Margin Preview */}
                      {stockForm.costPrice && stockForm.sellingPrice && (
                        <div className="mt-4 p-3 sm:p-4 bg-[#DDF4E7] rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-600">Profit Margin</span>
                            <span className="font-bold text-[#124170]">
                              {(
                                ((parseFloat(stockForm.sellingPrice) - parseFloat(stockForm.costPrice)) /
                                  parseFloat(stockForm.costPrice)) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button
                        onClick={resetStockForm}
                        className="w-full sm:flex-1 px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleStockIn}
                        className="w-full sm:flex-1 px-6 py-2.5 sm:py-3 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition font-medium text-sm sm:text-base"
                      >
                        Add Stock
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== ALERTS TAB ==================== */}
            {activeTab === "alerts" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-red-600 uppercase font-medium">Expired</p>
                    <p className="text-xl sm:text-3xl font-bold text-red-600">
                      {expiryAlerts.filter((a) => a.status === "expired").length}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-orange-600 uppercase font-medium">Critical ≤30d</p>
                    <p className="text-xl sm:text-3xl font-bold text-orange-600">
                      {expiryAlerts.filter((a) => a.status === "critical").length}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-yellow-600 uppercase font-medium">Warning ≤90d</p>
                    <p className="text-xl sm:text-3xl font-bold text-yellow-600">
                      {expiryAlerts.filter((a) => a.status === "warning").length}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-green-600 uppercase font-medium">Safe &gt;90d</p>
                    <p className="text-xl sm:text-3xl font-bold text-green-600">
                      {expiryAlerts.filter((a) => a.status === "safe").length}
                    </p>
                  </div>
                </div>

                {/* Expired and Critical Items */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-3 sm:px-4 py-2 sm:py-3 bg-red-50 border-b border-red-100">
                    <h3 className="font-medium text-red-700 text-sm sm:text-base">Expired & Critical Items</h3>
                  </div>

                  {expiryAlerts.filter((a) => a.status === "expired" || a.status === "critical").length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-gray-500 text-sm">
                      No expired or critical items
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden divide-y">
                        {expiryAlerts
                          .filter((a) => a.status === "expired" || a.status === "critical")
                          .map((alert) => (
                            <div key={alert._id} className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-sm">{alert.name}</p>
                                  <p className="text-xs text-gray-500">{alert.barcode}</p>
                                </div>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    alert.status === "expired"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-orange-100 text-orange-700"
                                  }`}
                                >
                                  {alert.status === "expired" ? "Expired" : `${alert.daysUntilExpiry}d`}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Batch: {alert.batchNumber}</span>
                                <span>Qty: {alert.quantity}</span>
                              </div>
                              <button className="w-full py-2 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100">
                                Remove Stock
                              </button>
                            </div>
                          ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left">Product</th>
                              <th className="px-4 py-3 text-left">Batch</th>
                              <th className="px-4 py-3 text-right">Quantity</th>
                              <th className="px-4 py-3 text-center">Expiry Date</th>
                              <th className="px-4 py-3 text-center">Status</th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {expiryAlerts
                              .filter((a) => a.status === "expired" || a.status === "critical")
                              .map((alert) => (
                                <tr key={alert._id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{alert.name}</p>
                                    <p className="text-xs text-gray-500">{alert.barcode}</p>
                                  </td>
                                  <td className="px-4 py-3">{alert.batchNumber}</td>
                                  <td className="px-4 py-3 text-right font-medium">{alert.quantity}</td>
                                  <td className="px-4 py-3 text-center">
                                    {new Date(alert.expiryDate).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                        alert.status === "expired"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-orange-100 text-orange-700"
                                      }`}
                                    >
                                      {alert.status === "expired"
                                        ? "Expired"
                                        : `${alert.daysUntilExpiry} days`}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button className="text-red-600 hover:text-red-800 text-xs font-medium">
                                      Remove Stock
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Warning Items */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-3 sm:px-4 py-2 sm:py-3 bg-yellow-50 border-b border-yellow-100">
                    <h3 className="font-medium text-yellow-700 text-sm sm:text-base">Warning Items (≤90 days)</h3>
                  </div>

                  {expiryAlerts.filter((a) => a.status === "warning").length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-gray-500 text-sm">
                      No items expiring within 90 days
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden divide-y">
                        {expiryAlerts
                          .filter((a) => a.status === "warning")
                          .map((alert) => (
                            <div key={alert._id} className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-sm">{alert.name}</p>
                                  <p className="text-xs text-gray-500">{alert.barcode}</p>
                                </div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  {alert.daysUntilExpiry}d
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Batch: {alert.batchNumber}</span>
                                <span>Qty: {alert.quantity}</span>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left">Product</th>
                              <th className="px-4 py-3 text-left">Batch</th>
                              <th className="px-4 py-3 text-right">Quantity</th>
                              <th className="px-4 py-3 text-center">Expiry Date</th>
                              <th className="px-4 py-3 text-center">Days Left</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {expiryAlerts
                              .filter((a) => a.status === "warning")
                              .map((alert) => (
                                <tr key={alert._id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{alert.name}</p>
                                    <p className="text-xs text-gray-500">{alert.barcode}</p>
                                  </td>
                                  <td className="px-4 py-3">{alert.batchNumber}</td>
                                  <td className="px-4 py-3 text-right font-medium">{alert.quantity}</td>
                                  <td className="px-4 py-3 text-center">
                                    {new Date(alert.expiryDate).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                      {alert.daysUntilExpiry} days
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ==================== HISTORY TAB ==================== */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-[#124170] text-sm sm:text-base">Stock Movement History</h3>
                </div>

                {stockHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No stock movements recorded
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-3">
                      {stockHistory.map((movement) => (
                        <div key={movement._id} className="bg-white border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{movement.productName}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(movement.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                movement.type === "in"
                                  ? "bg-green-100 text-green-700"
                                  : movement.type === "out"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {movement.type === "in" ? "+" : "-"}{movement.quantity}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                            {movement.batchNumber && <span>Batch: {movement.batchNumber}</span>}
                            {movement.reason && <span>• {movement.reason}</span>}
                            <span>• By: {movement.performedBy}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th className="px-4 py-3 text-center">Type</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-left">Batch</th>
                            <th className="px-4 py-3 text-left">Reason</th>
                            <th className="px-4 py-3 text-left">By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {stockHistory.map((movement) => (
                            <tr key={movement._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">
                                {new Date(movement.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 font-medium">{movement.productName}</td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                    movement.type === "in"
                                      ? "bg-green-100 text-green-700"
                                      : movement.type === "out"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {movement.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {movement.type === "in" ? "+" : "-"}
                                {movement.quantity}
                              </td>
                              <td className="px-4 py-3">{movement.batchNumber || "—"}</td>
                              <td className="px-4 py-3 text-gray-600">{movement.reason || "—"}</td>
                              <td className="px-4 py-3 text-gray-600">{movement.performedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ==================== STOCK REPORT TAB ==================== */}
            {activeTab === "stock-report" && (
              <div className="space-y-4 sm:space-y-6">
                {/* Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#124170] text-lg sm:text-xl">Stock Report</h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Track inventory movement and warehouse stock levels
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                          type="date"
                          value={reportDateRange.from}
                          onChange={(e) =>
                            setReportDateRange({ ...reportDateRange, from: e.target.value })
                          }
                          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input
                          type="date"
                          value={reportDateRange.to}
                          onChange={(e) =>
                            setReportDateRange({ ...reportDateRange, to: e.target.value })
                          }
                          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                        />
                      </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                      onClick={fetchStockReport}
                      disabled={reportLoading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] disabled:opacity-50 transition text-sm self-end"
                    >
                      <svg
                        className={`w-4 h-4 ${reportLoading ? "animate-spin" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-blue-600 uppercase font-medium">Opening Stock</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-700">
                      {stockReportSummary.totalOpeningQty.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-600">
                      ₵{stockReportSummary.totalOpeningValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-green-600 uppercase font-medium">Purchases</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-700">
                      +{stockReportSummary.totalPurchasesQty.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-green-600">
                      ₵{stockReportSummary.totalPurchasesValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-purple-600 uppercase font-medium">Balance</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-700">
                      {stockReportSummary.totalBalanceQty.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-purple-600">
                      ₵{stockReportSummary.totalBalanceValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-orange-600 uppercase font-medium">Consumption</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-700">
                      -{stockReportSummary.totalConsumptionQty.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-orange-600">
                      ₵{stockReportSummary.totalConsumptionValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-[#DDF4E7] border border-[#67C090] rounded-lg col-span-2 lg:col-span-1">
                    <p className="text-[10px] sm:text-xs text-[#124170] uppercase font-medium">Closing Stock</p>
                    <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                      {stockReportSummary.totalClosingQty.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-[#124170]">
                      ₵{stockReportSummary.totalClosingValue.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by product name or barcode..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    />
                  </div>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="border rounded-lg px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      // Export stock report to CSV
                      const headers = [
                        "S/N",
                        "Product Name",
                        "Barcode",
                        "Category",
                        "Opening Qty",
                        "Opening Amount",
                        "Purchases Qty",
                        "Purchases Amount",
                        "Balance Qty",
                        "Balance Amount",
                        "Consumption Qty",
                        "Consumption Amount",
                        "Closing Qty",
                        "Closing Amount",
                      ];
                      const csvContent = [
                        headers.join(","),
                        ...filteredStockReport.map((item, idx) =>
                          [
                            idx + 1,
                            `"${item.name}"`,
                            item.barcode,
                            item.category,
                            item.openingStock.qty,
                            item.openingStock.amount.toFixed(2),
                            item.purchases.qty,
                            item.purchases.amount.toFixed(2),
                            item.balance.qty,
                            item.balance.amount.toFixed(2),
                            item.consumption.qty,
                            item.consumption.amount.toFixed(2),
                            item.closingStock.qty,
                            item.closingStock.amount.toFixed(2),
                          ].join(",")
                        ),
                      ].join("\n");

                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `stock_report_${reportDateRange.from}_to_${reportDateRange.to}.csv`;
                      link.click();
                      URL.revokeObjectURL(link.href);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#124170] text-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    onClick={() => {
                      // Print stock report
                      const printContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>Stock Report</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .header h1 { color: #124170; margin: 0; font-size: 24px; }
                            .header p { color: #666; margin: 5px 0; }
                            .summary { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
                            .summary-card { flex: 1; min-width: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
                            .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
                            .summary-card .value { font-size: 18px; font-weight: bold; }
                            .summary-card .amount { font-size: 12px; color: #666; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                            th { background: #124170; color: white; font-size: 10px; }
                            .text-left { text-align: left; }
                            .text-right { text-align: right; }
                            .sub-header { background: #f5f5f5; font-size: 9px; }
                            tfoot td { font-weight: bold; background: #f9f9f9; }
                            @media print {
                              body { padding: 0; }
                              .summary-card { page-break-inside: avoid; }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>PharmacyPOS Stock Report</h1>
                            <p>Period: ${new Date(reportDateRange.from).toLocaleDateString()} - ${new Date(reportDateRange.to).toLocaleDateString()}</p>
                            <p>Generated: ${new Date().toLocaleString()}</p>
                          </div>

                          <div class="summary">
                            <div class="summary-card">
                              <div class="label">Opening Stock</div>
                              <div class="value">${stockReportSummary.totalOpeningQty.toLocaleString()}</div>
                              <div class="amount">₵${stockReportSummary.totalOpeningValue.toLocaleString()}</div>
                            </div>
                            <div class="summary-card">
                              <div class="label">Purchases</div>
                              <div class="value" style="color: green">+${stockReportSummary.totalPurchasesQty.toLocaleString()}</div>
                              <div class="amount">₵${stockReportSummary.totalPurchasesValue.toLocaleString()}</div>
                            </div>
                            <div class="summary-card">
                              <div class="label">Balance</div>
                              <div class="value">${stockReportSummary.totalBalanceQty.toLocaleString()}</div>
                              <div class="amount">₵${stockReportSummary.totalBalanceValue.toLocaleString()}</div>
                            </div>
                            <div class="summary-card">
                              <div class="label">Consumption</div>
                              <div class="value" style="color: orange">-${stockReportSummary.totalConsumptionQty.toLocaleString()}</div>
                              <div class="amount">₵${stockReportSummary.totalConsumptionValue.toLocaleString()}</div>
                            </div>
                            <div class="summary-card">
                              <div class="label">Closing Stock</div>
                              <div class="value" style="color: #124170">${stockReportSummary.totalClosingQty.toLocaleString()}</div>
                              <div class="amount">₵${stockReportSummary.totalClosingValue.toLocaleString()}</div>
                            </div>
                          </div>

                          <table>
                            <thead>
                              <tr>
                                <th rowspan="2">S/N</th>
                                <th rowspan="2" class="text-left">Product Name</th>
                                <th colspan="2">Opening Stock</th>
                                <th colspan="2">Purchases</th>
                                <th colspan="2">Balance</th>
                                <th colspan="2">Consumption</th>
                                <th colspan="2">Closing Stock</th>
                              </tr>
                              <tr class="sub-header">
                                <th>Qty</th>
                                <th>Amount</th>
                                <th>Qty</th>
                                <th>Amount</th>
                                <th>Qty</th>
                                <th>Amount</th>
                                <th>Qty</th>
                                <th>Amount</th>
                                <th>Qty</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${filteredStockReport
                                .map(
                                  (item, idx) => `
                                <tr>
                                  <td>${idx + 1}</td>
                                  <td class="text-left">${item.name}</td>
                                  <td>${item.openingStock.qty}</td>
                                  <td class="text-right">₵${item.openingStock.amount.toFixed(2)}</td>
                                  <td>${item.purchases.qty}</td>
                                  <td class="text-right">₵${item.purchases.amount.toFixed(2)}</td>
                                  <td>${item.balance.qty}</td>
                                  <td class="text-right">₵${item.balance.amount.toFixed(2)}</td>
                                  <td>${item.consumption.qty}</td>
                                  <td class="text-right">₵${item.consumption.amount.toFixed(2)}</td>
                                  <td>${item.closingStock.qty}</td>
                                  <td class="text-right">₵${item.closingStock.amount.toFixed(2)}</td>
                                </tr>
                              `
                                )
                                .join("")}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colspan="2" class="text-left">TOTAL</td>
                                <td>${stockReportSummary.totalOpeningQty.toLocaleString()}</td>
                                <td class="text-right">₵${stockReportSummary.totalOpeningValue.toLocaleString()}</td>
                                <td>${stockReportSummary.totalPurchasesQty.toLocaleString()}</td>
                                <td class="text-right">₵${stockReportSummary.totalPurchasesValue.toLocaleString()}</td>
                                <td>${stockReportSummary.totalBalanceQty.toLocaleString()}</td>
                                <td class="text-right">₵${stockReportSummary.totalBalanceValue.toLocaleString()}</td>
                                <td>${stockReportSummary.totalConsumptionQty.toLocaleString()}</td>
                                <td class="text-right">₵${stockReportSummary.totalConsumptionValue.toLocaleString()}</td>
                                <td>${stockReportSummary.totalClosingQty.toLocaleString()}</td>
                                <td class="text-right">₵${stockReportSummary.totalClosingValue.toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </body>
                        </html>
                      `;
                      const printWindow = window.open("", "_blank", "width=1200,height=800");
                      if (printWindow) {
                        printWindow.document.write(printContent);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 500);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Print</span>
                  </button>
                </div>

                {/* Auto-refresh indicator */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Auto-refreshes every 30 seconds</span>
                  <span className="text-gray-400">|</span>
                  <span>{filteredStockReport.length} products</span>
                </div>

                {/* Stock Report Table */}
                {reportLoading ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-12 h-12 mx-auto text-[#124170] animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <p className="mt-2 text-gray-500">Loading stock report...</p>
                  </div>
                ) : filteredStockReport.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-lg font-medium">No stock data found</p>
                    <p className="text-sm">Try adjusting the date range or filters</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden space-y-3">
                      {filteredStockReport.map((item, idx) => (
                        <div
                          key={item._id}
                          onClick={() => openProductDetail(item)}
                          className="bg-white border rounded-lg p-3 space-y-3 cursor-pointer hover:border-[#67C090] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between border-b pb-2">
                            <div>
                              <span className="text-xs text-gray-400">#{idx + 1}</span>
                              <p className="font-medium text-[#124170]">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.barcode}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.category && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  {item.category}
                                </span>
                              )}
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-blue-50 rounded-lg p-2">
                              <p className="text-[10px] text-blue-600 uppercase">Opening</p>
                              <p className="font-semibold text-blue-700">{item.openingStock.qty}</p>
                              <p className="text-xs text-blue-600">₵{item.openingStock.amount.toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2">
                              <p className="text-[10px] text-green-600 uppercase">Purchases</p>
                              <p className="font-semibold text-green-700">+{item.purchases.qty}</p>
                              <p className="text-xs text-green-600">₵{item.purchases.amount.toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-2">
                              <p className="text-[10px] text-purple-600 uppercase">Balance</p>
                              <p className="font-semibold text-purple-700">{item.balance.qty}</p>
                              <p className="text-xs text-purple-600">₵{item.balance.amount.toFixed(2)}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-2">
                              <p className="text-[10px] text-orange-600 uppercase">Consumption</p>
                              <p className="font-semibold text-orange-700">-{item.consumption.qty}</p>
                              <p className="text-xs text-orange-600">₵{item.consumption.amount.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="bg-[#DDF4E7] rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="text-[10px] text-[#124170] uppercase font-medium">Closing Stock</p>
                              <p className="text-lg font-bold text-[#124170]">{item.closingStock.qty} units</p>
                            </div>
                            <p className="text-lg font-bold text-[#124170]">
                              ₵{item.closingStock.amount.toFixed(2)}
                            </p>
                          </div>

                          <p className="text-xs text-center text-gray-400">Tap to view details</p>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#124170] text-white">
                            <th rowSpan={2} className="px-3 py-3 text-center border-r border-[#0d2f52]">
                              S/N
                            </th>
                            <th rowSpan={2} className="px-3 py-3 text-left border-r border-[#0d2f52]">
                              Product Name
                            </th>
                            <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-blue-600">
                              Opening Stock
                            </th>
                            <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-green-600">
                              Purchases
                            </th>
                            <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-purple-600">
                              Balance
                            </th>
                            <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-orange-500">
                              Consumption
                            </th>
                            <th colSpan={2} className="px-3 py-2 text-center bg-[#67C090]">
                              Closing Stock
                            </th>
                          </tr>
                          <tr className="bg-gray-100 text-gray-700 text-xs">
                            <th className="px-2 py-2 border-r">Qty</th>
                            <th className="px-2 py-2 border-r">Amount (₵)</th>
                            <th className="px-2 py-2 border-r">Qty</th>
                            <th className="px-2 py-2 border-r">Amount (₵)</th>
                            <th className="px-2 py-2 border-r">Qty</th>
                            <th className="px-2 py-2 border-r">Amount (₵)</th>
                            <th className="px-2 py-2 border-r">Qty</th>
                            <th className="px-2 py-2 border-r">Amount (₵)</th>
                            <th className="px-2 py-2 border-r">Qty</th>
                            <th className="px-2 py-2">Amount (₵)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredStockReport.map((item, idx) => (
                            <tr
                              key={item._id}
                              onClick={() => openProductDetail(item)}
                              className="hover:bg-[#DDF4E7]/30 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-3 text-center text-gray-500 border-r">{idx + 1}</td>
                              <td className="px-3 py-3 border-r">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-[#124170]">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.barcode}</p>
                                  </div>
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </td>
                              {/* Opening Stock */}
                              <td className="px-2 py-3 text-center border-r bg-blue-50/50">
                                {item.openingStock.qty}
                              </td>
                              <td className="px-2 py-3 text-right border-r bg-blue-50/50">
                                {item.openingStock.amount.toFixed(2)}
                              </td>
                              {/* Purchases */}
                              <td className="px-2 py-3 text-center border-r bg-green-50/50 text-green-700 font-medium">
                                {item.purchases.qty > 0 ? `+${item.purchases.qty}` : item.purchases.qty}
                              </td>
                              <td className="px-2 py-3 text-right border-r bg-green-50/50">
                                {item.purchases.amount.toFixed(2)}
                              </td>
                              {/* Balance */}
                              <td className="px-2 py-3 text-center border-r bg-purple-50/50 font-medium">
                                {item.balance.qty}
                              </td>
                              <td className="px-2 py-3 text-right border-r bg-purple-50/50">
                                {item.balance.amount.toFixed(2)}
                              </td>
                              {/* Consumption */}
                              <td className="px-2 py-3 text-center border-r bg-orange-50/50 text-orange-700 font-medium">
                                {item.consumption.qty > 0 ? `-${item.consumption.qty}` : item.consumption.qty}
                              </td>
                              <td className="px-2 py-3 text-right border-r bg-orange-50/50">
                                {item.consumption.amount.toFixed(2)}
                              </td>
                              {/* Closing Stock */}
                              <td className="px-2 py-3 text-center border-r bg-[#DDF4E7]/50 font-bold text-[#124170]">
                                {item.closingStock.qty}
                              </td>
                              <td className="px-2 py-3 text-right bg-[#DDF4E7]/50 font-bold text-[#124170]">
                                {item.closingStock.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={2} className="px-3 py-3 text-left border-r">
                              TOTAL
                            </td>
                            <td className="px-2 py-3 text-center border-r bg-blue-100">
                              {stockReportSummary.totalOpeningQty.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-right border-r bg-blue-100">
                              {stockReportSummary.totalOpeningValue.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-center border-r bg-green-100 text-green-700">
                              +{stockReportSummary.totalPurchasesQty.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-right border-r bg-green-100">
                              {stockReportSummary.totalPurchasesValue.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-center border-r bg-purple-100">
                              {stockReportSummary.totalBalanceQty.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-right border-r bg-purple-100">
                              {stockReportSummary.totalBalanceValue.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-center border-r bg-orange-100 text-orange-700">
                              -{stockReportSummary.totalConsumptionQty.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-right border-r bg-orange-100">
                              {stockReportSummary.totalConsumptionValue.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-center border-r bg-[#DDF4E7] text-[#124170]">
                              {stockReportSummary.totalClosingQty.toLocaleString()}
                            </td>
                            <td className="px-2 py-3 text-right bg-[#DDF4E7] text-[#124170]">
                              {stockReportSummary.totalClosingValue.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==================== EDIT MODAL ==================== */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#124170] text-white">
                <h2 className="text-base sm:text-lg font-semibold">Edit Product</h2>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                    <input
                      type="number"
                      value={editingItem.costPrice}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, costPrice: parseFloat(e.target.value) })
                      }
                      className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                    <input
                      type="number"
                      value={editingItem.sellingPrice}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, sellingPrice: parseFloat(e.target.value) })
                      }
                      className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={editingItem.reorderLevel}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, reorderLevel: parseInt(e.target.value) })
                    }
                    className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editingItem.location}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 border rounded-lg hover:bg-gray-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProduct}
                  className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ADJUST MODAL ==================== */}
        {showAdjustModal && adjustItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[#124170] text-white">
                <h2 className="text-base sm:text-lg font-semibold">Adjust Stock</h2>
                <p className="text-xs sm:text-sm text-white/70">{adjustItem.name}</p>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-500">Current Stock</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#124170]">{adjustItem.quantity} units</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, type: e.target.value as any })
                    }
                    className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  >
                    <option value="in">Stock In (+)</option>
                    <option value="out">Stock Out (-)</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    placeholder="Enter quantity"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <select
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    className="w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  >
                    <option value="">Select reason</option>
                    <option value="Restock">Restock</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Expired">Expired</option>
                    <option value="Lost">Lost</option>
                    <option value="Return">Customer Return</option>
                    <option value="Correction">Inventory Correction</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setAdjustItem(null);
                    setAdjustForm({ type: "in", quantity: "", reason: "" });
                  }}
                  className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 border rounded-lg hover:bg-gray-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStockAdjustment}
                  className="w-full sm:flex-1 px-4 py-2 sm:py-2.5 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== NOTIFICATION ==================== */}
        {notification && (
          <div
            className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:top-4 sm:bottom-auto sm:max-w-sm px-4 sm:px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
              notification.type === "success"
                ? "bg-green-500 text-white"
                : notification.type === "error"
                ? "bg-red-500 text-white"
                : "bg-yellow-500 text-white"
            }`}
          >
            <span className="font-medium text-sm sm:text-base">{notification.message}</span>
          </div>
        )}

        {/* ==================== PRODUCT DETAIL MODAL (Stock Report) ==================== */}
        {selectedReportProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 bg-[#124170] text-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">{selectedReportProduct.name}</h2>
                    <p className="text-sm text-white/70">{selectedReportProduct.barcode}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedReportProduct(null);
                      setProductMovements([]);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Product Info & Stock Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Product Info */}
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
                    <h3 className="font-semibold text-[#124170] mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Product Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Category</span>
                        <span className="font-medium">{selectedReportProduct.category || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cost Price</span>
                        <span className="font-medium">₵{selectedReportProduct.costPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Selling Price</span>
                        <span className="font-medium">₵{selectedReportProduct.sellingPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Profit Margin</span>
                        <span className="font-medium text-green-600">
                          {(((selectedReportProduct.sellingPrice - selectedReportProduct.costPrice) / selectedReportProduct.costPrice) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Summary for Period */}
                  <div className="bg-[#DDF4E7] rounded-xl p-4 sm:p-5">
                    <h3 className="font-semibold text-[#124170] mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Stock Summary
                    </h3>
                    <div className="text-xs text-gray-500 mb-3">
                      Period: {new Date(reportDateRange.from).toLocaleDateString()} - {new Date(reportDateRange.to).toLocaleDateString()}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-gray-600">Opening Stock</span>
                        <div className="text-right">
                          <span className="font-bold text-[#124170]">{selectedReportProduct.openingStock.qty}</span>
                          <span className="text-gray-500 text-sm ml-2">₵{selectedReportProduct.openingStock.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-green-600">+ Purchases</span>
                        <div className="text-right">
                          <span className="font-bold text-green-600">+{selectedReportProduct.purchases.qty}</span>
                          <span className="text-gray-500 text-sm ml-2">₵{selectedReportProduct.purchases.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-orange-600">- Consumption</span>
                        <div className="text-right">
                          <span className="font-bold text-orange-600">-{selectedReportProduct.consumption.qty}</span>
                          <span className="text-gray-500 text-sm ml-2">₵{selectedReportProduct.consumption.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="border-t border-[#124170]/20 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-[#124170]">Closing Stock</span>
                        <div className="text-right">
                          <span className="font-bold text-xl text-[#124170]">{selectedReportProduct.closingStock.qty}</span>
                          <span className="text-[#124170] text-sm ml-2">₵{selectedReportProduct.closingStock.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Flow Visualization */}
                <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
                  <h3 className="font-semibold text-[#124170] mb-4">Stock Flow</h3>
                  <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <span className="text-lg sm:text-xl font-bold text-blue-700">{selectedReportProduct.openingStock.qty}</span>
                      </div>
                      <p className="text-xs text-gray-500">Opening</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <span className="text-lg sm:text-xl font-bold text-green-700">+{selectedReportProduct.purchases.qty}</span>
                      </div>
                      <p className="text-xs text-gray-500">Purchases</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-2">
                        <span className="text-lg sm:text-xl font-bold text-purple-700">{selectedReportProduct.balance.qty}</span>
                      </div>
                      <p className="text-xs text-gray-500">Balance</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-2">
                        <span className="text-lg sm:text-xl font-bold text-orange-700">-{selectedReportProduct.consumption.qty}</span>
                      </div>
                      <p className="text-xs text-gray-500">Sold</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#124170] flex items-center justify-center mb-2">
                        <span className="text-lg sm:text-xl font-bold text-white">{selectedReportProduct.closingStock.qty}</span>
                      </div>
                      <p className="text-xs text-gray-500">Closing</p>
                    </div>
                  </div>
                </div>

                {/* Transaction History */}
                <div>
                  <h3 className="font-semibold text-[#124170] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Transaction History
                    <span className="text-xs font-normal text-gray-500">
                      ({new Date(reportDateRange.from).toLocaleDateString()} - {new Date(reportDateRange.to).toLocaleDateString()})
                    </span>
                  </h3>

                  {productMovementsLoading ? (
                    <div className="text-center py-8">
                      <svg
                        className="w-8 h-8 mx-auto text-[#124170] animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Loading transactions...</p>
                    </div>
                  ) : productMovements.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <svg
                        className="w-12 h-12 mx-auto text-gray-300 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <p className="text-gray-500">No transactions found for this period</p>
                      <p className="text-xs text-gray-400 mt-1">Try selecting a different date range</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Mobile Card View */}
                      <div className="block sm:hidden divide-y">
                        {productMovements.map((movement) => (
                          <div key={movement._id} className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {new Date(movement.createdAt).toLocaleString()}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  movement.type === "in"
                                    ? "bg-green-100 text-green-700"
                                    : movement.type === "out"
                                    ? "bg-red-100 text-red-700"
                                    : movement.type === "return"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {movement.type === "in" && "Stock In"}
                                {movement.type === "out" && "Stock Out"}
                                {movement.type === "adjustment" && "Adjustment"}
                                {movement.type === "return" && "Return"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{movement.reason || "—"}</span>
                              <span
                                className={`text-lg font-bold ${
                                  movement.type === "in" || movement.type === "return"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {movement.type === "in" || movement.type === "return" ? "+" : "-"}
                                {movement.quantity}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Batch: {movement.batchNumber || "—"}</span>
                              <span>By: {movement.performedBy}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <table className="w-full text-sm hidden sm:table">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">Date & Time</th>
                            <th className="px-4 py-3 text-center">Type</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-left">Batch</th>
                            <th className="px-4 py-3 text-left">Reason</th>
                            <th className="px-4 py-3 text-left">Performed By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {productMovements.map((movement) => (
                            <tr key={movement._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">
                                {new Date(movement.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    movement.type === "in"
                                      ? "bg-green-100 text-green-700"
                                      : movement.type === "out"
                                      ? "bg-red-100 text-red-700"
                                      : movement.type === "return"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {movement.type === "in" && "Stock In"}
                                  {movement.type === "out" && "Stock Out"}
                                  {movement.type === "adjustment" && "Adjustment"}
                                  {movement.type === "return" && "Return"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`font-bold ${
                                    movement.type === "in" || movement.type === "return"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {movement.type === "in" || movement.type === "return" ? "+" : "-"}
                                  {movement.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{movement.batchNumber || "—"}</td>
                              <td className="px-4 py-3 text-gray-600">{movement.reason || "—"}</td>
                              <td className="px-4 py-3 text-gray-600">{movement.performedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      // Print individual product report
                      const printContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>Stock Report - ${selectedReportProduct.name}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
                            .header { text-align: center; border-bottom: 2px solid #124170; padding-bottom: 15px; margin-bottom: 25px; }
                            .header h1 { color: #124170; margin: 0 0 5px; font-size: 22px; }
                            .header p { color: #666; margin: 0; font-size: 14px; }
                            .product-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
                            .info-card { background: #f9f9f9; padding: 15px; border-radius: 8px; }
                            .info-card h3 { color: #124170; margin: 0 0 10px; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                            .info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
                            .info-row .label { color: #666; }
                            .info-row .value { font-weight: 600; }
                            .flow-section { background: #DDF4E7; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
                            .flow-section h3 { color: #124170; margin: 0 0 15px; }
                            .flow-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; text-align: center; }
                            .flow-item { background: white; padding: 15px 10px; border-radius: 8px; }
                            .flow-item .value { font-size: 24px; font-weight: bold; color: #124170; }
                            .flow-item .label { font-size: 11px; color: #666; margin-top: 5px; }
                            .flow-item.green .value { color: #16a34a; }
                            .flow-item.orange .value { color: #ea580c; }
                            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                            th { background: #124170; color: white; }
                            .text-right { text-align: right; }
                            .text-center { text-align: center; }
                            .green { color: #16a34a; }
                            .red { color: #dc2626; }
                            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
                            @media print { body { padding: 15px; } }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>${selectedReportProduct.name}</h1>
                            <p>Barcode: ${selectedReportProduct.barcode} | Category: ${selectedReportProduct.category || "N/A"}</p>
                            <p style="margin-top: 8px;">Period: ${new Date(reportDateRange.from).toLocaleDateString()} - ${new Date(reportDateRange.to).toLocaleDateString()}</p>
                          </div>

                          <div class="product-info">
                            <div class="info-card">
                              <h3>Product Details</h3>
                              <div class="info-row">
                                <span class="label">Cost Price</span>
                                <span class="value">₵${selectedReportProduct.costPrice.toFixed(2)}</span>
                              </div>
                              <div class="info-row">
                                <span class="label">Selling Price</span>
                                <span class="value">₵${selectedReportProduct.sellingPrice.toFixed(2)}</span>
                              </div>
                              <div class="info-row">
                                <span class="label">Profit Margin</span>
                                <span class="value">${(((selectedReportProduct.sellingPrice - selectedReportProduct.costPrice) / selectedReportProduct.costPrice) * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                            <div class="info-card">
                              <h3>Stock Values</h3>
                              <div class="info-row">
                                <span class="label">Opening Value</span>
                                <span class="value">₵${selectedReportProduct.openingStock.amount.toFixed(2)}</span>
                              </div>
                              <div class="info-row">
                                <span class="label">Purchases Value</span>
                                <span class="value">₵${selectedReportProduct.purchases.amount.toFixed(2)}</span>
                              </div>
                              <div class="info-row">
                                <span class="label">Closing Value</span>
                                <span class="value">₵${selectedReportProduct.closingStock.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div class="flow-section">
                            <h3>Stock Flow Summary</h3>
                            <div class="flow-grid">
                              <div class="flow-item">
                                <div class="value">${selectedReportProduct.openingStock.qty}</div>
                                <div class="label">Opening</div>
                              </div>
                              <div class="flow-item green">
                                <div class="value">+${selectedReportProduct.purchases.qty}</div>
                                <div class="label">Purchases</div>
                              </div>
                              <div class="flow-item">
                                <div class="value">${selectedReportProduct.balance.qty}</div>
                                <div class="label">Balance</div>
                              </div>
                              <div class="flow-item orange">
                                <div class="value">-${selectedReportProduct.consumption.qty}</div>
                                <div class="label">Consumption</div>
                              </div>
                              <div class="flow-item">
                                <div class="value">${selectedReportProduct.closingStock.qty}</div>
                                <div class="label">Closing</div>
                              </div>
                            </div>
                          </div>

                          ${productMovements.length > 0 ? `
                          <h3 style="color: #124170; margin-bottom: 10px;">Transaction History</h3>
                          <table>
                            <thead>
                              <tr>
                                <th>Date & Time</th>
                                <th class="text-center">Type</th>
                                <th class="text-right">Qty</th>
                                <th>Batch</th>
                                <th>Reason</th>
                                <th>By</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${productMovements.map(m => `
                                <tr>
                                  <td>${new Date(m.createdAt).toLocaleString()}</td>
                                  <td class="text-center">${m.type === "in" ? "Stock In" : m.type === "out" ? "Stock Out" : m.type === "return" ? "Return" : "Adjustment"}</td>
                                  <td class="text-right ${m.type === "in" || m.type === "return" ? "green" : "red"}">${m.type === "in" || m.type === "return" ? "+" : "-"}${m.quantity}</td>
                                  <td>${m.batchNumber || "—"}</td>
                                  <td>${m.reason || "—"}</td>
                                  <td>${m.performedBy}</td>
                                </tr>
                              `).join("")}
                            </tbody>
                          </table>
                          ` : "<p style='color: #666; text-align: center; padding: 20px;'>No transactions recorded for this period</p>"}

                          <div class="footer">
                            <p>Generated on ${new Date().toLocaleString()}</p>
                            <p>PharmacyPOS Inventory Management System</p>
                          </div>
                        </body>
                        </html>
                      `;
                      const printWindow = window.open("", "_blank", "width=900,height=700");
                      if (printWindow) {
                        printWindow.document.write(printContent);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 500);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Report
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReportProduct(null);
                      setProductMovements([]);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
