import { useEffect, useState, useMemo } from "react";
import api from "../components/services/api";
import { useAuthStore } from "../components/store/authStore";
import SalesChart from "../components/charts/SalesChart";

type SalesReport = {
  date: string;
  total: number;
};

type LedgerEntry = {
  _id: string;
  type: "income" | "expense" | "tax" | "refund";
  category: string;
  amount: number;
  description: string;
  reference: string;
  createdAt: string;
};

type FinancialSummary = {
  totalRevenue: number;
  totalCost: number;
  totalExpenses: number;
  totalTax: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
};

type ExpenseBreakdown = {
  category: string;
  amount: number;
  percentage: number;
};

type TaxRecord = {
  _id: string;
  type: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  period: string;
  status: "pending" | "paid" | "filed";
  dueDate: string;
  paidDate: string | null;
};

type Employee = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  salary: number;
  dateOfEmployment: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  status: "active" | "inactive";
  createdAt: string;
};

type StockReportItem = {
  _id: string;
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  openingStock: { qty: number; amount: number };
  purchases: { qty: number; amount: number };
  balance: { qty: number; amount: number };
  consumption: { qty: number; amount: number };
  closingStock: { qty: number; amount: number };
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

type POSSale = {
  _id: string;
  storeType: "pharmacy" | "general";
  items: { productId: string; name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: string;
  paymentDetails: { cash: number; momo: number; card: number };
  customer: { customerId?: string; name: string; phone: string; email: string } | null;
  cashier?: string;
  createdAt: string;
};

type Tab = "sales" | "accounting" | "taxes" | "employees" | "stock" | "pos" | "cashiers";

export default function Reports() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "User";
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [loading, setLoading] = useState(true);

  // Sales data
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  // Financial data
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);

  // Employee data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Stock report data
  const [stockReport, setStockReport] = useState<StockReportItem[]>([]);
  const [stockReportSummary, setStockReportSummary] = useState<StockReportSummary>({
    totalOpeningValue: 0, totalPurchasesValue: 0, totalBalanceValue: 0,
    totalConsumptionValue: 0, totalClosingValue: 0, totalOpeningQty: 0,
    totalPurchasesQty: 0, totalBalanceQty: 0, totalConsumptionQty: 0, totalClosingQty: 0,
  });
  const [reportDateRange, setReportDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportCategory, setReportCategory] = useState("");
  const [categories, setCategories] = useState<{ _id: string; name: string; count: number }[]>([]);
  const [selectedReportProduct, setSelectedReportProduct] = useState<StockReportItem | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [productMovementsLoading, setProductMovementsLoading] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [filterType] = useState("");

  // POS Report data
  const [posSales, setPosSales] = useState<POSSale[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posDateRange, setPosDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [posSearch, setPosSearch] = useState("");
  const [posPaymentFilter, setPosPaymentFilter] = useState("");
  const [posSubView, setPosSubView] = useState<"overview" | "transactions" | "products" | "cashiers">("overview");
  const [selectedPosSale, setSelectedPosSale] = useState<POSSale | null>(null);

  // Cashier Report data
  const [cashierSales, setCashierSales] = useState<POSSale[]>([]);
  const [cashierEmployees, setCashierEmployees] = useState<Employee[]>([]);
  const [cashierLoading, setCashierLoading] = useState(false);
  const [cashierDateRange, setCashierDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [cashierSearch, setCashierSearch] = useState("");
  const [selectedCashierName, setSelectedCashierName] = useState<string | null>(null);
  const [cashierReportView, setCashierReportView] = useState<"list" | "detail">("list");

  // Fetch data based on active tab
  useEffect(() => {
    setLoading(true);

    const fetchData = async () => {
      try {
        if (activeTab === "sales") {
          const [salesRes, ledgerRes] = await Promise.all([
            api.get<SalesReport[]>("/reports/sales", {
              params: { from: dateRange.from, to: dateRange.to },
            }),
            api.get<LedgerEntry[]>("/accounting/ledger", {
              params: { from: dateRange.from, to: dateRange.to },
            }),
          ]);
          setSalesData(salesRes.data);
          setLedger(ledgerRes.data);
        } else if (activeTab === "accounting") {
          const [summaryRes, expenseRes, ledgerRes] = await Promise.all([
            api.get<FinancialSummary>("/accounting/summary", {
              params: { from: dateRange.from, to: dateRange.to },
            }),
            api.get<ExpenseBreakdown[]>("/accounting/expenses/breakdown", {
              params: { from: dateRange.from, to: dateRange.to },
            }),
            api.get<LedgerEntry[]>("/accounting/ledger", {
              params: { from: dateRange.from, to: dateRange.to },
            }),
          ]);
          setFinancialSummary(summaryRes.data);
          setExpenseBreakdown(expenseRes.data);
          setLedger(ledgerRes.data);
        } else if (activeTab === "taxes") {
          const taxRes = await api.get<TaxRecord[]>("/accounting/taxes", {
            params: { year: new Date(dateRange.from).getFullYear() },
          });
          setTaxRecords(taxRes.data);
        } else if (activeTab === "employees") {
          const empRes = await api.get<Employee[]>("/employees");
          setEmployees(empRes.data);
        } else if (activeTab === "stock") {
          fetchStockReport();
          try {
            const catRes = await api.get<{ _id: string; name: string; count: number }[]>("/inventory/categories");
            setCategories(catRes.data);
          } catch {}
        } else if (activeTab === "pos") {
          setPosLoading(true);
          try {
            const salesRes = await api.get<POSSale[]>("/sales", {
              params: { from: posDateRange.from, to: posDateRange.to },
            });
            setPosSales(salesRes.data);
          } catch (err) {
            console.error("Failed to fetch POS sales:", err);
          } finally {
            setPosLoading(false);
          }
        } else if (activeTab === "cashiers") {
          setCashierLoading(true);
          try {
            const empRes = await api.get<Employee[]>("/employees");
            setCashierEmployees(Array.isArray(empRes.data) ? empRes.data : []);
          } catch (err) {
            console.error("Failed to fetch employees for cashier report:", err);
          }
          try {
            const salesRes = await api.get<POSSale[]>("/sales", {
              params: { from: cashierDateRange.from, to: cashierDateRange.to },
            });
            setCashierSales(Array.isArray(salesRes.data) ? salesRes.data : []);
          } catch (err) {
            console.error("Failed to fetch sales for cashier report:", err);
          }
          setCashierLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, dateRange]);

  // Stock report: auto-refresh when date range changes
  useEffect(() => {
    if (activeTab === "stock") {
      fetchStockReport();
    }
  }, [reportDateRange]);

  useEffect(() => {
    if (activeTab === "pos") {
      const fetchPosSales = async () => {
        setPosLoading(true);
        try {
          const salesRes = await api.get<POSSale[]>("/sales", {
            params: { from: posDateRange.from, to: posDateRange.to },
          });
          setPosSales(salesRes.data);
        } catch (err) {
          console.error("Failed to fetch POS sales:", err);
        } finally {
          setPosLoading(false);
        }
      };
      fetchPosSales();
    }
  }, [posDateRange]);

  useEffect(() => {
    if (activeTab === "cashiers") {
      const fetchCashierData = async () => {
        setCashierLoading(true);
        try {
          const empRes = await api.get<Employee[]>("/employees");
          setCashierEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        } catch (err) {
          console.error("Failed to fetch employees for cashier report:", err);
        }
        try {
          const salesRes = await api.get<POSSale[]>("/sales", {
            params: { from: cashierDateRange.from, to: cashierDateRange.to },
          });
          setCashierSales(Array.isArray(salesRes.data) ? salesRes.data : []);
        } catch (err) {
          console.error("Failed to fetch sales for cashier report:", err);
        }
        setCashierLoading(false);
      };
      fetchCashierData();
    }
  }, [cashierDateRange]);

  const fetchStockReport = async () => {
    try {
      setReportLoading(true);
      const res = await api.get<{ report: StockReportItem[]; summary: StockReportSummary }>(
        "/inventory/stock-report",
        { params: { from: reportDateRange.from, to: reportDateRange.to } }
      );
      setStockReport(res.data.report);
      setStockReportSummary(res.data.summary);
    } catch {
      // Fallback: calculate from local data
      try {
        const [inventoryRes, historyRes] = await Promise.all([
          api.get<any[]>("/inventory"),
          api.get<StockMovement[]>("/inventory/stock-history", {
            params: { from: reportDateRange.from, to: reportDateRange.to },
          }),
        ]);
        const inventory = inventoryRes.data;
        const history = historyRes.data;
        const reportItems: StockReportItem[] = inventory.map((item: any) => {
          const moves = history.filter((h) => h.productId === item._id);
          const purchasesQty = moves.filter((m) => m.type === "in").reduce((s, m) => s + m.quantity, 0);
          const consumptionQty = moves.filter((m) => m.type === "out" || m.type === "adjustment").reduce((s, m) => s + Math.abs(m.quantity), 0);
          const closingQty = item.quantity;
          const openingQty = closingQty - purchasesQty + consumptionQty;
          const balanceQty = openingQty + purchasesQty;
          return {
            _id: item._id, barcode: item.barcode, name: item.name, category: item.category,
            costPrice: item.costPrice, sellingPrice: item.sellingPrice,
            openingStock: { qty: Math.max(0, openingQty), amount: Math.max(0, openingQty) * item.costPrice },
            purchases: { qty: purchasesQty, amount: purchasesQty * item.costPrice },
            balance: { qty: Math.max(0, balanceQty), amount: Math.max(0, balanceQty) * item.costPrice },
            consumption: { qty: consumptionQty, amount: consumptionQty * item.sellingPrice },
            closingStock: { qty: closingQty, amount: closingQty * item.costPrice },
          };
        });
        const summary: StockReportSummary = {
          totalOpeningQty: reportItems.reduce((s, r) => s + r.openingStock.qty, 0),
          totalOpeningValue: reportItems.reduce((s, r) => s + r.openingStock.amount, 0),
          totalPurchasesQty: reportItems.reduce((s, r) => s + r.purchases.qty, 0),
          totalPurchasesValue: reportItems.reduce((s, r) => s + r.purchases.amount, 0),
          totalBalanceQty: reportItems.reduce((s, r) => s + r.balance.qty, 0),
          totalBalanceValue: reportItems.reduce((s, r) => s + r.balance.amount, 0),
          totalConsumptionQty: reportItems.reduce((s, r) => s + r.consumption.qty, 0),
          totalConsumptionValue: reportItems.reduce((s, r) => s + r.consumption.amount, 0),
          totalClosingQty: reportItems.reduce((s, r) => s + r.closingStock.qty, 0),
          totalClosingValue: reportItems.reduce((s, r) => s + r.closingStock.amount, 0),
        };
        setStockReport(reportItems);
        setStockReportSummary(summary);
      } catch (err) {
        console.error("Failed to calculate stock report:", err);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const fetchProductMovements = async (productId: string) => {
    try {
      setProductMovementsLoading(true);
      const res = await api.get<StockMovement[]>(`/inventory/stock-history/${productId}`, {
        params: { from: reportDateRange.from, to: reportDateRange.to },
      });
      setProductMovements(res.data);
    } catch {
      setProductMovements([]);
    } finally {
      setProductMovementsLoading(false);
    }
  };

  const openProductDetail = (product: StockReportItem) => {
    setSelectedReportProduct(product);
    fetchProductMovements(product._id);
  };

  // Filter stock report items
  const filteredStockReport = useMemo(() => {
    let result = [...stockReport];
    if (reportSearch) {
      const search = reportSearch.toLowerCase();
      result = result.filter(
        (item) => item.name.toLowerCase().includes(search) || item.barcode.toLowerCase().includes(search)
      );
    }
    if (reportCategory) {
      result = result.filter((item) => item.category === reportCategory);
    }
    return result;
  }, [stockReport, reportSearch, reportCategory]);

  // Filter ledger entries
  const filteredLedger = useMemo(() => {
    if (!filterType) return ledger;
    return ledger.filter((l) => l.type === filterType);
  }, [ledger, filterType]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const search = employeeSearch.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(search) ||
        emp.email.toLowerCase().includes(search) ||
        emp.role.toLowerCase().includes(search) ||
        emp.department?.toLowerCase().includes(search)
    );
  }, [employees, employeeSearch]);

  // POS Report computed values
  const filteredPosSales = useMemo(() => {
    let result = [...posSales];
    if (posSearch) {
      const search = posSearch.toLowerCase();
      result = result.filter(
        (sale) =>
          sale.items.some((item) => item.name.toLowerCase().includes(search)) ||
          sale.customer?.name?.toLowerCase().includes(search) ||
          sale.cashier?.toLowerCase().includes(search) ||
          sale._id.toLowerCase().includes(search)
      );
    }
    if (posPaymentFilter) {
      result = result.filter((sale) => sale.paymentMethod === posPaymentFilter);
    }
    return result;
  }, [posSales, posSearch, posPaymentFilter]);

  const posStats = useMemo(() => {
    const totalRevenue = filteredPosSales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = filteredPosSales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
    const uniqueCustomers = new Set(filteredPosSales.filter((s) => s.customer?.name).map((s) => s.customer!.name)).size;
    const paymentMethods = filteredPosSales.reduce((acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topPaymentMethod = Object.entries(paymentMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    return {
      totalTransactions: filteredPosSales.length,
      totalRevenue,
      avgSale: filteredPosSales.length > 0 ? totalRevenue / filteredPosSales.length : 0,
      totalItems,
      uniqueCustomers,
      topPaymentMethod,
    };
  }, [filteredPosSales]);

  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string; qty: number; revenue: number; transactions: number }> = {};
    filteredPosSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productMap[item.name]) {
          productMap[item.name] = { name: item.name, qty: 0, revenue: 0, transactions: 0 };
        }
        productMap[item.name].qty += item.quantity;
        productMap[item.name].revenue += item.total;
        productMap[item.name].transactions += 1;
      });
    });
    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  }, [filteredPosSales]);

  const cashierStats = useMemo(() => {
    const cashierMap: Record<string, { name: string; transactions: number; revenue: number; payments: Record<string, number> }> = {};
    filteredPosSales.forEach((sale) => {
      const name = sale.cashier || "Unknown";
      if (!cashierMap[name]) {
        cashierMap[name] = { name, transactions: 0, revenue: 0, payments: {} };
      }
      cashierMap[name].transactions += 1;
      cashierMap[name].revenue += sale.total;
      cashierMap[name].payments[sale.paymentMethod] = (cashierMap[name].payments[sale.paymentMethod] || 0) + 1;
    });
    return Object.values(cashierMap).sort((a, b) => b.revenue - a.revenue);
  }, [filteredPosSales]);

  // Cashier Report computed data
  const cashierReportData = useMemo(() => {
    const cashierMap: Record<string, {
      name: string;
      employee: Employee | null;
      transactions: number;
      revenue: number;
      totalItems: number;
      payments: Record<string, { count: number; total: number }>;
      dailySales: Record<string, { date: string; transactions: number; revenue: number }>;
      productsSold: Record<string, { name: string; qty: number; revenue: number }>;
      sales: POSSale[];
    }> = {};

    // Seed from employees with role "cashier" so they appear even with 0 sales
    cashierEmployees
      .filter((emp) => emp.role?.toLowerCase().trim().includes("cashier"))
      .forEach((emp) => {
        const key = emp.name.toLowerCase();
        if (!cashierMap[key]) {
          cashierMap[key] = {
            name: emp.name,
            employee: emp,
            transactions: 0,
            revenue: 0,
            totalItems: 0,
            payments: {},
            dailySales: {},
            productsSold: {},
            sales: [],
          };
        }
      });

    // Layer sales data on top — only track sales for registered cashiers
    cashierSales.forEach((sale) => {
      const name = sale.cashier || "Unknown";
      const key = name.toLowerCase();
      if (!cashierMap[key]) return; // skip sales from non-cashier employees
      const c = cashierMap[key];
      c.transactions += 1;
      c.revenue += sale.total;
      c.totalItems += sale.items.reduce((s, i) => s + i.quantity, 0);
      c.sales.push(sale);

      // Payment breakdown
      const pm = sale.paymentMethod;
      if (!c.payments[pm]) c.payments[pm] = { count: 0, total: 0 };
      c.payments[pm].count += 1;
      c.payments[pm].total += sale.total;

      // Daily sales
      const day = new Date(sale.createdAt).toISOString().split("T")[0];
      if (!c.dailySales[day]) c.dailySales[day] = { date: day, transactions: 0, revenue: 0 };
      c.dailySales[day].transactions += 1;
      c.dailySales[day].revenue += sale.total;

      // Products sold
      sale.items.forEach((item) => {
        if (!c.productsSold[item.name]) c.productsSold[item.name] = { name: item.name, qty: 0, revenue: 0 };
        c.productsSold[item.name].qty += item.quantity;
        c.productsSold[item.name].revenue += item.total;
      });
    });

    return Object.values(cashierMap).sort((a, b) => b.revenue - a.revenue);
  }, [cashierSales, cashierEmployees]);

  const filteredCashierData = useMemo(() => {
    if (!cashierSearch) return cashierReportData;
    const search = cashierSearch.toLowerCase();
    return cashierReportData.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.employee?.role?.toLowerCase().includes(search) ||
        c.employee?.department?.toLowerCase().includes(search)
    );
  }, [cashierReportData, cashierSearch]);

  const selectedCashierDetail = useMemo(() => {
    if (!selectedCashierName) return null;
    return cashierReportData.find((c) => c.name === selectedCashierName) || null;
  }, [cashierReportData, selectedCashierName]);

  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; total: number }> = {};
    filteredPosSales.forEach((sale) => {
      const method = sale.paymentMethod;
      if (!breakdown[method]) breakdown[method] = { count: 0, total: 0 };
      breakdown[method].count += 1;
      breakdown[method].total += sale.total;
    });
    return breakdown;
  }, [filteredPosSales]);

  // Calculate local summary from ledger if API doesn't provide it
  const calculatedSummary = useMemo(() => {
    if (financialSummary) return financialSummary;

    const income = ledger
      .filter((l) => l.type === "income")
      .reduce((sum, l) => sum + l.amount, 0);
    const expenses = ledger
      .filter((l) => l.type === "expense")
      .reduce((sum, l) => sum + l.amount, 0);
    const taxes = ledger
      .filter((l) => l.type === "tax")
      .reduce((sum, l) => sum + l.amount, 0);
    const refunds = ledger
      .filter((l) => l.type === "refund")
      .reduce((sum, l) => sum + l.amount, 0);

    const grossProfit = income - refunds;
    const netProfit = grossProfit - expenses - taxes;
    const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;

    return {
      totalRevenue: income,
      totalCost: 0,
      totalExpenses: expenses,
      totalTax: taxes,
      grossProfit,
      netProfit,
      profitMargin,
    };
  }, [financialSummary, ledger]);

  // Calculate years of service
  const getYearsOfService = (dateOfEmployment: string) => {
    const startDate = new Date(dateOfEmployment);
    const today = new Date();
    const years = today.getFullYear() - startDate.getFullYear();
    const months = today.getMonth() - startDate.getMonth();

    if (years < 1) {
      const totalMonths = years * 12 + months;
      return `${totalMonths} month${totalMonths !== 1 ? "s" : ""}`;
    }

    return `${years} year${years !== 1 ? "s" : ""}${months > 0 ? `, ${months} month${months !== 1 ? "s" : ""}` : ""}`;
  };

  // Export financial report
  const exportFinancialReport = () => {
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 3px solid #124170; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #124170; margin: 0; font-size: 28px; }
          .header p { color: #666; margin: 10px 0 0; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #124170; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #124170; }
          .summary-card.profit { border-color: #22c55e; }
          .summary-card.loss { border-color: #ef4444; }
          .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #124170; margin-top: 5px; }
          .summary-card.profit .value { color: #22c55e; }
          .summary-card.loss .value { color: #ef4444; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #124170; color: white; font-weight: 600; }
          tr:nth-child(even) { background: #f9f9f9; }
          .text-right { text-align: right; }
          .income { color: #22c55e; }
          .expense { color: #ef4444; }
          .statement { background: #f8f9fa; padding: 20px; border-radius: 8px; }
          .statement-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .statement-row.total { border-top: 2px solid #124170; border-bottom: none; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px; }
          .statement-row.total.profit { color: #22c55e; }
          .statement-row.total.loss { color: #ef4444; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PharmacyPOS Financial Report</h1>
          <p>Period: ${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}</p>
        </div>

        <div class="section">
          <h2>Financial Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Revenue</div>
              <div class="value">₵${calculatedSummary.totalRevenue.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Expenses</div>
              <div class="value">₵${calculatedSummary.totalExpenses.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Tax</div>
              <div class="value">₵${calculatedSummary.totalTax.toLocaleString()}</div>
            </div>
            <div class="summary-card ${calculatedSummary.grossProfit >= 0 ? 'profit' : 'loss'}">
              <div class="label">Gross Profit</div>
              <div class="value">₵${calculatedSummary.grossProfit.toLocaleString()}</div>
            </div>
            <div class="summary-card ${calculatedSummary.netProfit >= 0 ? 'profit' : 'loss'}">
              <div class="label">Net Profit</div>
              <div class="value">₵${calculatedSummary.netProfit.toLocaleString()}</div>
            </div>
            <div class="summary-card ${calculatedSummary.profitMargin >= 0 ? 'profit' : 'loss'}">
              <div class="label">Profit Margin</div>
              <div class="value">${calculatedSummary.profitMargin.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Profit & Loss Statement</h2>
          <div class="statement">
            <div class="statement-row">
              <span>Revenue (Sales)</span>
              <span>₵${calculatedSummary.totalRevenue.toLocaleString()}</span>
            </div>
            <div class="statement-row">
              <span>Cost of Goods Sold</span>
              <span>-₵${calculatedSummary.totalCost.toLocaleString()}</span>
            </div>
            <div class="statement-row total ${calculatedSummary.grossProfit >= 0 ? 'profit' : 'loss'}">
              <span>Gross Profit</span>
              <span>₵${calculatedSummary.grossProfit.toLocaleString()}</span>
            </div>
            <div class="statement-row">
              <span>Operating Expenses</span>
              <span>-₵${calculatedSummary.totalExpenses.toLocaleString()}</span>
            </div>
            <div class="statement-row">
              <span>Taxes</span>
              <span>-₵${calculatedSummary.totalTax.toLocaleString()}</span>
            </div>
            <div class="statement-row total ${calculatedSummary.netProfit >= 0 ? 'profit' : 'loss'}">
              <span>Net Profit / (Loss)</span>
              <span>${calculatedSummary.netProfit >= 0 ? '' : '('}₵${Math.abs(calculatedSummary.netProfit).toLocaleString()}${calculatedSummary.netProfit >= 0 ? '' : ')'}</span>
            </div>
          </div>
        </div>

        ${expenseBreakdown.length > 0 ? `
        <div class="section">
          <h2>Expense Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th class="text-right">Amount</th>
                <th class="text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              ${expenseBreakdown.map(e => `
                <tr>
                  <td>${e.category}</td>
                  <td class="text-right">₵${e.amount.toLocaleString()}</td>
                  <td class="text-right">${e.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>PharmacyPOS Accounting System</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  // Export employee report
  const exportEmployeeReport = (employee: Employee) => {
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Report - ${employee.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 3px solid #124170; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #124170; margin: 0; font-size: 24px; }
          .header p { color: #666; margin: 10px 0 0; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #124170; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-item { padding: 10px; background: #f8f9fa; border-radius: 6px; }
          .info-item .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-item .value { font-size: 14px; font-weight: 600; color: #124170; margin-top: 4px; }
          .full-width { grid-column: span 2; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .badge-active { background: #dcfce7; color: #166534; }
          .badge-inactive { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${employee.name}</h1>
          <p>${employee.role} - ${employee.department || 'No Department'}</p>
          <span class="badge ${employee.status === 'active' ? 'badge-active' : 'badge-inactive'}">${employee.status || 'Active'}</span>
        </div>

        <div class="section">
          <h2>Personal Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Full Name</div>
              <div class="value">${employee.name}</div>
            </div>
            <div class="info-item">
              <div class="label">Email Address</div>
              <div class="value">${employee.email}</div>
            </div>
            <div class="info-item">
              <div class="label">Phone Number</div>
              <div class="value">${employee.phone || 'Not provided'}</div>
            </div>
            <div class="info-item">
              <div class="label">Address</div>
              <div class="value">${employee.address || 'Not provided'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Employment Details</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Role</div>
              <div class="value">${employee.role}</div>
            </div>
            <div class="info-item">
              <div class="label">Department</div>
              <div class="value">${employee.department || 'Not assigned'}</div>
            </div>
            <div class="info-item">
              <div class="label">Date of Employment</div>
              <div class="value">${new Date(employee.dateOfEmployment).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="label">Years of Service</div>
              <div class="value">${getYearsOfService(employee.dateOfEmployment)}</div>
            </div>
            <div class="info-item">
              <div class="label">Monthly Salary</div>
              <div class="value">₵${employee.salary?.toLocaleString() || 'Not set'}</div>
            </div>
            <div class="info-item">
              <div class="label">Annual Salary</div>
              <div class="value">₵${employee.salary ? (employee.salary * 12).toLocaleString() : 'Not set'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Emergency Contact</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Contact Name</div>
              <div class="value">${employee.emergencyContact || 'Not provided'}</div>
            </div>
            <div class="info-item">
              <div class="label">Contact Phone</div>
              <div class="value">${employee.emergencyPhone || 'Not provided'}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>PharmacyPOS Employee Management System</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  // Export ledger to CSV
  const exportLedgerCSV = () => {
    const headers = ["Date", "Type", "Category", "Description", "Amount", "Reference"];
    const csvContent = [
      headers.join(","),
      ...filteredLedger.map((l) =>
        [
          new Date(l.createdAt).toLocaleDateString(),
          l.type,
          l.category || "",
          `"${l.description || ""}"`,
          l.amount,
          l.reference || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ledger_${dateRange.from}_${dateRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export employees to CSV
  const exportEmployeesCSV = () => {
    const headers = ["Name", "Email", "Phone", "Role", "Department", "Salary", "Date of Employment", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredEmployees.map((emp) =>
        [
          `"${emp.name}"`,
          emp.email,
          emp.phone || "",
          emp.role,
          emp.department || "",
          emp.salary || "",
          emp.dateOfEmployment ? new Date(emp.dateOfEmployment).toLocaleDateString() : "",
          emp.status || "active",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `employees_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPosSalesCSV = () => {
    const headers = ["Date", "Receipt #", "Items", "Subtotal", "Tax", "Total", "Payment Method", "Cashier", "Customer"];
    const csvContent = [
      headers.join(","),
      ...filteredPosSales.map((sale) =>
        [
          new Date(sale.createdAt).toLocaleString(),
          sale._id.slice(-8).toUpperCase(),
          sale.items.length,
          sale.subtotal.toFixed(2),
          sale.tax.toFixed(2),
          sale.total.toFixed(2),
          sale.paymentMethod,
          `"${sale.cashier || "N/A"}"`,
          `"${sale.customer?.name || "Walk-in"}"`,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pos_sales_${posDateRange.from}_${posDateRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportCashierReportCSV = () => {
    const headers = ["Cashier", "Role", "Department", "Status", "Transactions", "Total Revenue", "Avg Sale", "Items Sold", "Top Payment Method"];
    const csvContent = [
      headers.join(","),
      ...cashierReportData.map((c) => {
        const topMethod = Object.entries(c.payments).sort((a, b) => b[1].total - a[1].total)[0];
        return [
          `"${c.name}"`,
          `"${c.employee?.role || "N/A"}"`,
          `"${c.employee?.department || "N/A"}"`,
          c.employee?.status || "N/A",
          c.transactions,
          c.revenue.toFixed(2),
          c.transactions > 0 ? (c.revenue / c.transactions).toFixed(2) : "0.00",
          c.totalItems,
          topMethod?.[0] || "N/A",
        ].join(",");
      }),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cashier_report_${cashierDateRange.from}_${cashierDateRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const tabs: { id: Tab; label: string; shortLabel: string }[] = [
    { id: "sales", label: "Sales Reports", shortLabel: "Sales" },
    { id: "accounting", label: "Accounting", shortLabel: "Accounting" },
    { id: "taxes", label: "Tax Records", shortLabel: "Taxes" },
    { id: "employees", label: "Employee Reports", shortLabel: "Employees" },
    { id: "stock", label: "Stock Report", shortLabel: "Stock" },
    { id: "pos", label: "POS Report", shortLabel: "POS" },
    { id: "cashiers", label: "Cashier Reports", shortLabel: "Cashiers" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      <main className="px-3 sm:px-4 lg:px-6 py-4 lg:py-6 max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#124170]">
              Welcome, <span className="text-[#67C090]">{firstName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {activeTab !== "employees" && activeTab !== "stock" && activeTab !== "pos" && activeTab !== "cashiers" && (
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b px-2 sm:px-4">
            <nav className="flex gap-1 sm:gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[#124170] text-[#124170]"
                      : "border-transparent text-gray-500 hover:text-[#124170]"
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3 sm:p-4 lg:p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Sales Tab */}
                {activeTab === "sales" && (
                  <div className="space-y-6">
                    {/* Sales Chart */}
                    <div className="bg-white rounded-lg border p-4 sm:p-6">
                      <h2 className="font-medium text-[#124170] mb-4">Sales Trend</h2>
                      <SalesChart data={salesData} />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Sales</p>
                        <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                          ₵{salesData.reduce((sum, s) => sum + s.total, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Avg Daily Sales</p>
                        <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                          ₵{salesData.length > 0
                            ? (salesData.reduce((sum, s) => sum + s.total, 0) / salesData.length).toFixed(0)
                            : 0}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Best Day</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">
                          ₵{salesData.length > 0
                            ? Math.max(...salesData.map((s) => s.total)).toLocaleString()
                            : 0}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Days Tracked</p>
                        <p className="text-lg sm:text-2xl font-bold text-[#124170]">{salesData.length}</p>
                      </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="p-3 sm:p-4 border-b flex items-center justify-between">
                        <h2 className="font-medium text-[#124170]">Transaction Ledger</h2>
                        <button
                          onClick={exportLedgerCSV}
                          className="text-sm text-[#124170] hover:text-[#67C090]"
                        >
                          Export CSV
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 sm:px-4 py-3 text-left font-medium text-gray-600">Date</th>
                              <th className="px-3 sm:px-4 py-3 text-left font-medium text-gray-600">Type</th>
                              <th className="px-3 sm:px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                              <th className="px-3 sm:px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Reference</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ledger.slice(0, 20).map((l) => (
                              <tr key={l._id} className="hover:bg-gray-50">
                                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">
                                  {new Date(l.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-3 sm:px-4 py-3">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                      l.type === "income"
                                        ? "bg-green-100 text-green-700"
                                        : l.type === "expense"
                                        ? "bg-red-100 text-red-700"
                                        : l.type === "tax"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {l.type}
                                  </span>
                                </td>
                                <td
                                  className={`px-3 sm:px-4 py-3 text-right font-medium ${
                                    l.type === "income"
                                      ? "text-green-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {l.type === "income" ? "+" : "-"}₵{l.amount.toLocaleString()}
                                </td>
                                <td className="px-3 sm:px-4 py-3 text-gray-500 hidden sm:table-cell">{l.reference}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accounting Tab */}
                {activeTab === "accounting" && (
                  <div className="space-y-6">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Revenue</p>
                        <p className="text-base sm:text-xl font-bold text-[#124170]">
                          ₵{calculatedSummary.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Cost of Goods</p>
                        <p className="text-base sm:text-xl font-bold text-gray-600">
                          ₵{calculatedSummary.totalCost.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Expenses</p>
                        <p className="text-base sm:text-xl font-bold text-red-500">
                          ₵{calculatedSummary.totalExpenses.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Tax</p>
                        <p className="text-base sm:text-xl font-bold text-yellow-600">
                          ₵{calculatedSummary.totalTax.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Gross Profit</p>
                        <p
                          className={`text-base sm:text-xl font-bold ${
                            calculatedSummary.grossProfit >= 0
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          ₵{calculatedSummary.grossProfit.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Net Profit</p>
                        <p
                          className={`text-base sm:text-xl font-bold ${
                            calculatedSummary.netProfit >= 0
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          ₵{calculatedSummary.netProfit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Profit & Loss Statement */}
                    <div className="bg-white rounded-lg border p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="font-medium text-[#124170]">
                          Profit & Loss Statement
                        </h2>
                        <button
                          onClick={exportFinancialReport}
                          className="px-3 sm:px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-xs sm:text-sm"
                        >
                          Export Report
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Revenue Section */}
                        <div className="border-b pb-4">
                          <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase mb-3">
                            Revenue
                          </h3>
                          <div className="flex justify-between py-2 text-sm">
                            <span>Sales Revenue</span>
                            <span className="font-medium">
                              ₵{calculatedSummary.totalRevenue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 text-xs sm:text-sm text-gray-500">
                            <span>Less: Returns & Refunds</span>
                            <span>-₵0</span>
                          </div>
                          <div className="flex justify-between py-2 font-semibold border-t mt-2 pt-2 text-sm">
                            <span>Net Revenue</span>
                            <span className="text-[#124170]">
                              ₵{calculatedSummary.totalRevenue.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Net Profit */}
                        <div
                          className={`rounded-lg p-4 ${
                            calculatedSummary.netProfit >= 0
                              ? "bg-green-50"
                              : "bg-red-50"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-base sm:text-lg font-semibold">
                              {calculatedSummary.netProfit >= 0
                                ? "Net Profit"
                                : "Net Loss"}
                            </span>
                            <span
                              className={`text-xl sm:text-2xl font-bold ${
                                calculatedSummary.netProfit >= 0
                                  ? "text-green-600"
                                  : "text-red-500"
                              }`}
                            >
                              {calculatedSummary.netProfit < 0 && "("}₵
                              {Math.abs(calculatedSummary.netProfit).toLocaleString()}
                              {calculatedSummary.netProfit < 0 && ")"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-500">Profit Margin</span>
                            <span
                              className={
                                calculatedSummary.profitMargin >= 0
                                  ? "text-green-600"
                                  : "text-red-500"
                              }
                            >
                              {calculatedSummary.profitMargin.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Taxes Tab */}
                {activeTab === "taxes" && (
                  <div className="space-y-6">
                    {/* Tax Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Tax Due</p>
                        <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                          ₵{taxRecords
                            .filter((t) => t.status === "pending")
                            .reduce((sum, t) => sum + t.taxAmount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Tax Paid</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">
                          ₵{taxRecords
                            .filter((t) => t.status === "paid")
                            .reduce((sum, t) => sum + t.taxAmount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Pending Filing</p>
                        <p className="text-lg sm:text-2xl font-bold text-yellow-600">
                          {taxRecords.filter((t) => t.status === "pending").length}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Records</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-600">
                          {taxRecords.length}
                        </p>
                      </div>
                    </div>

                    {/* Tax Calculator */}
                    <div className="bg-white rounded-lg border p-4 sm:p-6">
                      <h2 className="font-medium text-[#124170] mb-4">Tax Calculator</h2>
                      <TaxCalculator />
                    </div>

                    {/* Tax Records Table */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="p-3 sm:p-4 border-b">
                        <h2 className="font-medium text-[#124170]">Tax Records</h2>
                      </div>
                      {taxRecords.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No tax records found
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 sm:px-4 py-3 text-left font-medium text-gray-600">Period</th>
                                <th className="px-3 sm:px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Type</th>
                                <th className="px-3 sm:px-4 py-3 text-right font-medium text-gray-600">Tax Amount</th>
                                <th className="px-3 sm:px-4 py-3 text-center font-medium text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {taxRecords.map((tax) => (
                                <tr key={tax._id} className="hover:bg-gray-50">
                                  <td className="px-3 sm:px-4 py-3 font-medium">{tax.period}</td>
                                  <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">{tax.type}</td>
                                  <td className="px-3 sm:px-4 py-3 text-right font-medium text-[#124170]">
                                    ₵{tax.taxAmount.toLocaleString()}
                                  </td>
                                  <td className="px-3 sm:px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                        tax.status === "paid"
                                          ? "bg-green-100 text-green-700"
                                          : tax.status === "filed"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-yellow-100 text-yellow-700"
                                      }`}
                                    >
                                      {tax.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Employees Tab */}
                {activeTab === "employees" && (
                  <div className="space-y-6">
                    {/* Employee Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Employees</p>
                        <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                          {employees.length}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Active</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">
                          {employees.filter((e) => e.status !== "inactive").length}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Payroll</p>
                        <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                          ₵{employees.reduce((sum, e) => sum + (e.salary || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Avg Salary</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-600">
                          ₵{employees.length > 0
                            ? Math.round(employees.reduce((sum, e) => sum + (e.salary || 0), 0) / employees.length).toLocaleString()
                            : 0}
                        </p>
                      </div>
                    </div>

                    {/* Search and Export */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Search by name, email, role, department..."
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                        />
                      </div>
                      <button
                        onClick={exportEmployeesCSV}
                        className="px-4 py-2.5 border border-[#124170] text-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition text-sm"
                      >
                        Export CSV
                      </button>
                    </div>

                    {/* Employee List */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="p-3 sm:p-4 border-b">
                        <h2 className="font-medium text-[#124170]">Employee Directory</h2>
                      </div>

                      {filteredEmployees.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No employees found
                        </div>
                      ) : (
                        <>
                          {/* Mobile Card View */}
                          <div className="block lg:hidden divide-y">
                            {filteredEmployees.map((emp) => (
                              <div
                                key={emp._id}
                                className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setSelectedEmployee(emp)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-[#124170]">{emp.name}</p>
                                    <p className="text-xs text-gray-500">{emp.email}</p>
                                  </div>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    {emp.role}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                  <span className="text-gray-600">
                                    ₵{emp.salary?.toLocaleString() || "N/A"}/mo
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600">
                                    Joined {emp.dateOfEmployment ? new Date(emp.dateOfEmployment).toLocaleDateString() : "N/A"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop Table View */}
                          <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                                  <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                                  <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                                  <th className="px-4 py-3 text-right font-medium text-gray-600">Salary</th>
                                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date of Employment</th>
                                  <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {filteredEmployees.map((emp) => (
                                  <tr key={emp._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                      <div>
                                        <p className="font-medium text-[#124170]">{emp.name}</p>
                                        <p className="text-xs text-gray-500">{emp.email}</p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                        {emp.role}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                      {emp.department || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                      ₵{emp.salary?.toLocaleString() || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                      {emp.dateOfEmployment
                                        ? new Date(emp.dateOfEmployment).toLocaleDateString()
                                        : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => setSelectedEmployee(emp)}
                                        className="px-3 py-1.5 text-xs bg-[#124170] text-white rounded hover:bg-[#0d2f52] transition"
                                      >
                                        View Details
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
                  </div>
                )}

                {/* Stock Report Tab */}
                {activeTab === "stock" && (
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
                        <div className="flex items-center gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">From</label>
                            <input
                              type="date"
                              value={reportDateRange.from}
                              onChange={(e) => setReportDateRange({ ...reportDateRange, from: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">To</label>
                            <input
                              type="date"
                              value={reportDateRange.to}
                              onChange={(e) => setReportDateRange({ ...reportDateRange, to: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            />
                          </div>
                        </div>
                        <button
                          onClick={fetchStockReport}
                          disabled={reportLoading}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] disabled:opacity-50 transition text-sm self-end"
                        >
                          <svg className={`w-4 h-4 ${reportLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span className="hidden sm:inline">Refresh</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
                      <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-[10px] sm:text-xs text-blue-600 uppercase font-medium">Opening Stock</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-700">{stockReportSummary.totalOpeningQty.toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-blue-600">₵{stockReportSummary.totalOpeningValue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-[10px] sm:text-xs text-green-600 uppercase font-medium">Purchases</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-700">+{stockReportSummary.totalPurchasesQty.toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-green-600">₵{stockReportSummary.totalPurchasesValue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-[10px] sm:text-xs text-purple-600 uppercase font-medium">Balance</p>
                        <p className="text-lg sm:text-2xl font-bold text-purple-700">{stockReportSummary.totalBalanceQty.toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-purple-600">₵{stockReportSummary.totalBalanceValue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-[10px] sm:text-xs text-orange-600 uppercase font-medium">Consumption</p>
                        <p className="text-lg sm:text-2xl font-bold text-orange-700">-{stockReportSummary.totalConsumptionQty.toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-orange-600">₵{stockReportSummary.totalConsumptionValue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-[#DDF4E7] border border-[#67C090] rounded-lg col-span-2 lg:col-span-1">
                        <p className="text-[10px] sm:text-xs text-[#124170] uppercase font-medium">Closing Stock</p>
                        <p className="text-lg sm:text-2xl font-bold text-[#124170]">{stockReportSummary.totalClosingQty.toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-[#124170]">₵{stockReportSummary.totalClosingValue.toLocaleString()}</p>
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
                          <option key={cat._id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const headers = ["S/N","Product Name","Barcode","Category","Opening Qty","Opening Amount","Purchases Qty","Purchases Amount","Balance Qty","Balance Amount","Consumption Qty","Consumption Amount","Closing Qty","Closing Amount"];
                          const csvContent = [
                            headers.join(","),
                            ...filteredStockReport.map((item, idx) =>
                              [idx + 1, `"${item.name}"`, item.barcode, item.category, item.openingStock.qty, item.openingStock.amount.toFixed(2), item.purchases.qty, item.purchases.amount.toFixed(2), item.balance.qty, item.balance.amount.toFixed(2), item.consumption.qty, item.consumption.amount.toFixed(2), item.closingStock.qty, item.closingStock.amount.toFixed(2)].join(",")
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">Export</span>
                      </button>
                      <button
                        onClick={() => {
                          const printContent = `<!DOCTYPE html><html><head><title>Stock Report</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}.header{text-align:center;margin-bottom:20px}.header h1{color:#124170;margin:0;font-size:24px}.header p{color:#666;margin:5px 0}.summary{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}.summary-card{flex:1;min-width:120px;padding:10px;border:1px solid #ddd;border-radius:8px;text-align:center}.summary-card .label{font-size:10px;color:#666;text-transform:uppercase}.summary-card .value{font-size:18px;font-weight:bold}.summary-card .amount{font-size:12px;color:#666}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background:#124170;color:white;font-size:10px}.text-left{text-align:left}.text-right{text-align:right}.sub-header{background:#f5f5f5;font-size:9px}tfoot td{font-weight:bold;background:#f9f9f9}@media print{body{padding:0}}</style></head><body><div class="header"><h1>PharmacyPOS Stock Report</h1><p>Period: ${new Date(reportDateRange.from).toLocaleDateString()} - ${new Date(reportDateRange.to).toLocaleDateString()}</p><p>Generated: ${new Date().toLocaleString()}</p></div><div class="summary"><div class="summary-card"><div class="label">Opening Stock</div><div class="value">${stockReportSummary.totalOpeningQty.toLocaleString()}</div><div class="amount">₵${stockReportSummary.totalOpeningValue.toLocaleString()}</div></div><div class="summary-card"><div class="label">Purchases</div><div class="value" style="color:green">+${stockReportSummary.totalPurchasesQty.toLocaleString()}</div><div class="amount">₵${stockReportSummary.totalPurchasesValue.toLocaleString()}</div></div><div class="summary-card"><div class="label">Balance</div><div class="value">${stockReportSummary.totalBalanceQty.toLocaleString()}</div><div class="amount">₵${stockReportSummary.totalBalanceValue.toLocaleString()}</div></div><div class="summary-card"><div class="label">Consumption</div><div class="value" style="color:orange">-${stockReportSummary.totalConsumptionQty.toLocaleString()}</div><div class="amount">₵${stockReportSummary.totalConsumptionValue.toLocaleString()}</div></div><div class="summary-card"><div class="label">Closing Stock</div><div class="value" style="color:#124170">${stockReportSummary.totalClosingQty.toLocaleString()}</div><div class="amount">₵${stockReportSummary.totalClosingValue.toLocaleString()}</div></div></div><table><thead><tr><th rowspan="2">S/N</th><th rowspan="2" class="text-left">Product Name</th><th colspan="2">Opening Stock</th><th colspan="2">Purchases</th><th colspan="2">Balance</th><th colspan="2">Consumption</th><th colspan="2">Closing Stock</th></tr><tr class="sub-header"><th>Qty</th><th>Amount</th><th>Qty</th><th>Amount</th><th>Qty</th><th>Amount</th><th>Qty</th><th>Amount</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${filteredStockReport.map((item, idx) => `<tr><td>${idx + 1}</td><td class="text-left">${item.name}</td><td>${item.openingStock.qty}</td><td class="text-right">₵${item.openingStock.amount.toFixed(2)}</td><td>${item.purchases.qty}</td><td class="text-right">₵${item.purchases.amount.toFixed(2)}</td><td>${item.balance.qty}</td><td class="text-right">₵${item.balance.amount.toFixed(2)}</td><td>${item.consumption.qty}</td><td class="text-right">₵${item.consumption.amount.toFixed(2)}</td><td>${item.closingStock.qty}</td><td class="text-right">₵${item.closingStock.amount.toFixed(2)}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2" class="text-left">TOTAL</td><td>${stockReportSummary.totalOpeningQty.toLocaleString()}</td><td class="text-right">₵${stockReportSummary.totalOpeningValue.toLocaleString()}</td><td>${stockReportSummary.totalPurchasesQty.toLocaleString()}</td><td class="text-right">₵${stockReportSummary.totalPurchasesValue.toLocaleString()}</td><td>${stockReportSummary.totalBalanceQty.toLocaleString()}</td><td class="text-right">₵${stockReportSummary.totalBalanceValue.toLocaleString()}</td><td>${stockReportSummary.totalConsumptionQty.toLocaleString()}</td><td class="text-right">₵${stockReportSummary.totalConsumptionValue.toLocaleString()}</td><td>${stockReportSummary.totalClosingQty.toLocaleString()}</td><td class="text-right">₵${stockReportSummary.totalClosingValue.toLocaleString()}</td></tr></tfoot></table></body></html>`;
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span className="hidden sm:inline">Print</span>
                      </button>
                    </div>

                    {/* Info bar */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{filteredStockReport.length} products</span>
                    </div>

                    {/* Stock Report Table */}
                    {reportLoading ? (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 mx-auto text-[#124170] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <p className="mt-2 text-gray-500">Loading stock report...</p>
                      </div>
                    ) : filteredStockReport.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{item.category}</span>
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
                                <p className="text-lg font-bold text-[#124170]">₵{item.closingStock.amount.toFixed(2)}</p>
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
                                <th rowSpan={2} className="px-3 py-3 text-center border-r border-[#0d2f52]">S/N</th>
                                <th rowSpan={2} className="px-3 py-3 text-left border-r border-[#0d2f52]">Product Name</th>
                                <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-blue-600">Opening Stock</th>
                                <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-green-600">Purchases</th>
                                <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-purple-600">Balance</th>
                                <th colSpan={2} className="px-3 py-2 text-center border-r border-[#0d2f52] bg-orange-500">Consumption</th>
                                <th colSpan={2} className="px-3 py-2 text-center bg-[#67C090]">Closing Stock</th>
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
                                <tr key={item._id} onClick={() => openProductDetail(item)} className="hover:bg-[#DDF4E7]/30 cursor-pointer transition-colors">
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
                                  <td className="px-2 py-3 text-center border-r bg-blue-50/50">{item.openingStock.qty}</td>
                                  <td className="px-2 py-3 text-right border-r bg-blue-50/50">{item.openingStock.amount.toFixed(2)}</td>
                                  <td className="px-2 py-3 text-center border-r bg-green-50/50 text-green-700 font-medium">{item.purchases.qty > 0 ? `+${item.purchases.qty}` : item.purchases.qty}</td>
                                  <td className="px-2 py-3 text-right border-r bg-green-50/50">{item.purchases.amount.toFixed(2)}</td>
                                  <td className="px-2 py-3 text-center border-r bg-purple-50/50 font-medium">{item.balance.qty}</td>
                                  <td className="px-2 py-3 text-right border-r bg-purple-50/50">{item.balance.amount.toFixed(2)}</td>
                                  <td className="px-2 py-3 text-center border-r bg-orange-50/50 text-orange-700 font-medium">{item.consumption.qty > 0 ? `-${item.consumption.qty}` : item.consumption.qty}</td>
                                  <td className="px-2 py-3 text-right border-r bg-orange-50/50">{item.consumption.amount.toFixed(2)}</td>
                                  <td className="px-2 py-3 text-center border-r bg-[#DDF4E7]/50 font-bold text-[#124170]">{item.closingStock.qty}</td>
                                  <td className="px-2 py-3 text-right bg-[#DDF4E7]/50 font-bold text-[#124170]">{item.closingStock.amount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-100 font-bold">
                                <td colSpan={2} className="px-3 py-3 text-left border-r">TOTAL</td>
                                <td className="px-2 py-3 text-center border-r bg-blue-100">{stockReportSummary.totalOpeningQty.toLocaleString()}</td>
                                <td className="px-2 py-3 text-right border-r bg-blue-100">{stockReportSummary.totalOpeningValue.toLocaleString()}</td>
                                <td className="px-2 py-3 text-center border-r bg-green-100 text-green-700">+{stockReportSummary.totalPurchasesQty.toLocaleString()}</td>
                                <td className="px-2 py-3 text-right border-r bg-green-100">{stockReportSummary.totalPurchasesValue.toLocaleString()}</td>
                                <td className="px-2 py-3 text-center border-r bg-purple-100">{stockReportSummary.totalBalanceQty.toLocaleString()}</td>
                                <td className="px-2 py-3 text-right border-r bg-purple-100">{stockReportSummary.totalBalanceValue.toLocaleString()}</td>
                                <td className="px-2 py-3 text-center border-r bg-orange-100 text-orange-700">-{stockReportSummary.totalConsumptionQty.toLocaleString()}</td>
                                <td className="px-2 py-3 text-right border-r bg-orange-100">{stockReportSummary.totalConsumptionValue.toLocaleString()}</td>
                                <td className="px-2 py-3 text-center border-r bg-[#DDF4E7] text-[#124170]">{stockReportSummary.totalClosingQty.toLocaleString()}</td>
                                <td className="px-2 py-3 text-right bg-[#DDF4E7] text-[#124170]">{stockReportSummary.totalClosingValue.toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* POS Report Tab */}
                {activeTab === "pos" && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Header & Date Range */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[#124170] text-lg sm:text-xl">POS Sales Report</h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Comprehensive overview of all point-of-sale transactions
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">From</label>
                            <input
                              type="date"
                              value={posDateRange.from}
                              onChange={(e) => setPosDateRange({ ...posDateRange, from: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">To</label>
                            <input
                              type="date"
                              value={posDateRange.to}
                              onChange={(e) => setPosDateRange({ ...posDateRange, to: e.target.value })}
                              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub-view Navigation */}
                    <div className="flex gap-1 sm:gap-2 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                      {(["overview", "transactions", "products", "cashiers"] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setPosSubView(view)}
                          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap capitalize ${
                            posSubView === view
                              ? "bg-[#124170] text-white shadow"
                              : "text-gray-600 hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>

                    {posLoading ? (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 mx-auto text-[#124170] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <p className="mt-2 text-gray-500">Loading POS data...</p>
                      </div>
                    ) : (
                      <>
                        {/* Overview Sub-view */}
                        {posSubView === "overview" && (
                          <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Transactions</p>
                                <p className="text-lg sm:text-2xl font-bold text-[#124170]">{posStats.totalTransactions}</p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Revenue</p>
                                <p className="text-lg sm:text-2xl font-bold text-green-600">₵{posStats.totalRevenue.toLocaleString()}</p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Avg Sale</p>
                                <p className="text-lg sm:text-2xl font-bold text-[#124170]">₵{posStats.avgSale.toFixed(2)}</p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Items Sold</p>
                                <p className="text-lg sm:text-2xl font-bold text-[#124170]">{posStats.totalItems.toLocaleString()}</p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Customers</p>
                                <p className="text-lg sm:text-2xl font-bold text-[#124170]">{posStats.uniqueCustomers}</p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Top Payment</p>
                                <p className="text-lg sm:text-2xl font-bold text-[#124170] capitalize">{posStats.topPaymentMethod}</p>
                              </div>
                            </div>

                            {/* Payment Breakdown */}
                            <div className="bg-white rounded-lg border p-4 sm:p-6">
                              <h4 className="font-medium text-[#124170] mb-4">Payment Method Breakdown</h4>
                              {Object.keys(paymentBreakdown).length === 0 ? (
                                <p className="text-gray-500 text-sm">No payment data available</p>
                              ) : (
                                <div className="space-y-3">
                                  {Object.entries(paymentBreakdown).map(([method, data]) => {
                                    const percentage = posStats.totalRevenue > 0 ? (data.total / posStats.totalRevenue) * 100 : 0;
                                    const colors: Record<string, string> = { cash: "bg-green-500", momo: "bg-yellow-500", card: "bg-blue-500", split: "bg-purple-500" };
                                    return (
                                      <div key={method}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-medium capitalize">{method}</span>
                                          <span className="text-sm text-gray-600">
                                            {data.count} sales - ₵{data.total.toLocaleString()} ({percentage.toFixed(1)}%)
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                          <div
                                            className={`h-3 rounded-full ${colors[method] || "bg-gray-500"}`}
                                            style={{ width: `${Math.max(percentage, 1)}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Recent Transactions */}
                            <div className="bg-white rounded-lg border overflow-hidden">
                              <div className="p-3 sm:p-4 border-b flex items-center justify-between">
                                <h4 className="font-medium text-[#124170]">Recent Transactions</h4>
                                <button
                                  onClick={() => setPosSubView("transactions")}
                                  className="text-sm text-[#67C090] hover:text-[#124170]"
                                >
                                  View All
                                </button>
                              </div>
                              <div className="divide-y">
                                {filteredPosSales.slice(0, 5).map((sale) => (
                                  <div
                                    key={sale._id}
                                    className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                    onClick={() => setSelectedPosSale(sale)}
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-[#124170]">
                                        #{sale._id.slice(-8).toUpperCase()}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(sale.createdAt).toLocaleString()} - {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-[#124170]">₵{sale.total.toLocaleString()}</p>
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                        sale.paymentMethod === "cash" ? "bg-green-100 text-green-700"
                                        : sale.paymentMethod === "momo" ? "bg-yellow-100 text-yellow-700"
                                        : sale.paymentMethod === "card" ? "bg-blue-100 text-blue-700"
                                        : "bg-purple-100 text-purple-700"
                                      }`}>
                                        {sale.paymentMethod}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {filteredPosSales.length === 0 && (
                                  <div className="p-8 text-center text-gray-500">No transactions found</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Transactions Sub-view */}
                        {posSubView === "transactions" && (
                          <div className="space-y-4">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  placeholder="Search by product, customer, cashier, or receipt #..."
                                  value={posSearch}
                                  onChange={(e) => setPosSearch(e.target.value)}
                                  className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                                />
                              </div>
                              <select
                                value={posPaymentFilter}
                                onChange={(e) => setPosPaymentFilter(e.target.value)}
                                className="border rounded-lg px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                              >
                                <option value="">All Payments</option>
                                <option value="cash">Cash</option>
                                <option value="momo">MoMo</option>
                                <option value="card">Card</option>
                                <option value="split">Split</option>
                              </select>
                              <button
                                onClick={exportPosSalesCSV}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#124170] text-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span className="hidden sm:inline">Export CSV</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{filteredPosSales.length} transactions</span>
                            </div>

                            {filteredPosSales.length === 0 ? (
                              <div className="text-center py-12 text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-lg font-medium">No transactions found</p>
                                <p className="text-sm">Try adjusting the date range or filters</p>
                              </div>
                            ) : (
                              <>
                                {/* Mobile Card View */}
                                <div className="block lg:hidden space-y-3">
                                  {filteredPosSales.map((sale) => (
                                    <div
                                      key={sale._id}
                                      onClick={() => setSelectedPosSale(sale)}
                                      className="bg-white border rounded-lg p-3 cursor-pointer hover:border-[#67C090] hover:shadow-md transition-all"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <p className="font-medium text-[#124170]">#{sale._id.slice(-8).toUpperCase()}</p>
                                          <p className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleString()}</p>
                                        </div>
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                          sale.paymentMethod === "cash" ? "bg-green-100 text-green-700"
                                          : sale.paymentMethod === "momo" ? "bg-yellow-100 text-yellow-700"
                                          : sale.paymentMethod === "card" ? "bg-blue-100 text-blue-700"
                                          : "bg-purple-100 text-purple-700"
                                        }`}>
                                          {sale.paymentMethod}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</span>
                                        <span className="font-bold text-[#124170]">₵{sale.total.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                        <span>{sale.cashier || "N/A"}</span>
                                        <span>{sale.customer?.name || "Walk-in"}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto border rounded-lg">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Receipt #</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Items</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Payment</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Cashier</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {filteredPosSales.map((sale) => (
                                        <tr key={sale._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPosSale(sale)}>
                                          <td className="px-4 py-3 text-gray-600">{new Date(sale.createdAt).toLocaleString()}</td>
                                          <td className="px-4 py-3 font-medium text-[#124170]">#{sale._id.slice(-8).toUpperCase()}</td>
                                          <td className="px-4 py-3 text-center">{sale.items.length}</td>
                                          <td className="px-4 py-3 text-right font-bold text-[#124170]">₵{sale.total.toLocaleString()}</td>
                                          <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                              sale.paymentMethod === "cash" ? "bg-green-100 text-green-700"
                                              : sale.paymentMethod === "momo" ? "bg-yellow-100 text-yellow-700"
                                              : sale.paymentMethod === "card" ? "bg-blue-100 text-blue-700"
                                              : "bg-purple-100 text-purple-700"
                                            }`}>
                                              {sale.paymentMethod}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-gray-600">{sale.cashier || "N/A"}</td>
                                          <td className="px-4 py-3 text-gray-600">{sale.customer?.name || "Walk-in"}</td>
                                          <td className="px-4 py-3 text-center">
                                            <button className="px-3 py-1.5 text-xs bg-[#124170] text-white rounded hover:bg-[#0d2f52] transition">
                                              View
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
                        )}

                        {/* Products Sub-view */}
                        {posSubView === "products" && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{topProducts.length} products sold</span>
                            </div>

                            {topProducts.length === 0 ? (
                              <div className="text-center py-12 text-gray-500">
                                <p className="text-lg font-medium">No product data available</p>
                                <p className="text-sm">Sales data will appear once transactions are recorded</p>
                              </div>
                            ) : (
                              <>
                                {/* Mobile Card View */}
                                <div className="block lg:hidden space-y-3">
                                  {topProducts.map((product, idx) => (
                                    <div key={product.name} className="bg-white border rounded-lg p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="w-7 h-7 rounded-full bg-[#124170] text-white flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                          </span>
                                          <p className="font-medium text-[#124170]">{product.name}</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                        <div className="bg-gray-50 rounded p-2">
                                          <p className="text-[10px] text-gray-500 uppercase">Qty Sold</p>
                                          <p className="font-bold text-[#124170]">{product.qty}</p>
                                        </div>
                                        <div className="bg-green-50 rounded p-2">
                                          <p className="text-[10px] text-gray-500 uppercase">Revenue</p>
                                          <p className="font-bold text-green-600">₵{product.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-blue-50 rounded p-2">
                                          <p className="text-[10px] text-gray-500 uppercase">Avg Price</p>
                                          <p className="font-bold text-blue-600">₵{(product.revenue / product.qty).toFixed(2)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto border rounded-lg">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">#</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Product Name</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Qty Sold</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Unit Price</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600"># Transactions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {topProducts.map((product, idx) => {
                                        const maxRevenue = topProducts[0]?.revenue || 1;
                                        return (
                                          <tr key={product.name} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                              <div>
                                                <p className="font-medium text-[#124170]">{product.name}</p>
                                                <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                                  <div className="h-1.5 rounded-full bg-[#67C090]" style={{ width: `${(product.revenue / maxRevenue) * 100}%` }} />
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">{product.qty.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-bold text-green-600">₵{product.revenue.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right">₵{(product.revenue / product.qty).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">{product.transactions}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Cashiers Sub-view */}
                        {posSubView === "cashiers" && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{cashierStats.length} cashier{cashierStats.length !== 1 ? "s" : ""}</span>
                            </div>

                            {cashierStats.length === 0 ? (
                              <div className="text-center py-12 text-gray-500">
                                <p className="text-lg font-medium">No cashier data available</p>
                                <p className="text-sm">Cashier performance data will appear once transactions are recorded</p>
                              </div>
                            ) : (
                              <>
                                {/* Mobile Card View */}
                                <div className="block lg:hidden space-y-3">
                                  {cashierStats.map((cashier, _idx) => {
                                    const topMethod = Object.entries(cashier.payments).sort((a, b) => b[1] - a[1])[0];
                                    return (
                                      <div key={cashier.name} className="bg-white border rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="w-8 h-8 rounded-full bg-[#124170] text-white flex items-center justify-center text-sm font-bold">
                                            {cashier.name.charAt(0).toUpperCase()}
                                          </span>
                                          <div>
                                            <p className="font-medium text-[#124170]">{cashier.name}</p>
                                            <p className="text-xs text-gray-500">{cashier.transactions} transactions</p>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                          <div className="bg-green-50 rounded p-2">
                                            <p className="text-[10px] text-gray-500 uppercase">Revenue</p>
                                            <p className="font-bold text-green-600">₵{cashier.revenue.toLocaleString()}</p>
                                          </div>
                                          <div className="bg-blue-50 rounded p-2">
                                            <p className="text-[10px] text-gray-500 uppercase">Avg Sale</p>
                                            <p className="font-bold text-blue-600">₵{cashier.transactions > 0 ? (cashier.revenue / cashier.transactions).toFixed(2) : "0.00"}</p>
                                          </div>
                                          <div className="bg-purple-50 rounded p-2">
                                            <p className="text-[10px] text-gray-500 uppercase">Top Method</p>
                                            <p className="font-bold text-purple-600 capitalize">{topMethod?.[0] || "N/A"}</p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto border rounded-lg">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Cashier</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600"># Transactions</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Total Revenue</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Sale</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Top Payment Method</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Performance</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {cashierStats.map((cashier) => {
                                        const topMethod = Object.entries(cashier.payments).sort((a, b) => b[1] - a[1])[0];
                                        const maxRevenue = cashierStats[0]?.revenue || 1;
                                        return (
                                          <tr key={cashier.name} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-[#124170] text-white flex items-center justify-center text-sm font-bold">
                                                  {cashier.name.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="font-medium text-[#124170]">{cashier.name}</span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">{cashier.transactions}</td>
                                            <td className="px-4 py-3 text-right font-bold text-green-600">₵{cashier.revenue.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right">₵{cashier.transactions > 0 ? (cashier.revenue / cashier.transactions).toFixed(2) : "0.00"}</td>
                                            <td className="px-4 py-3 text-center">
                                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                                topMethod?.[0] === "cash" ? "bg-green-100 text-green-700"
                                                : topMethod?.[0] === "momo" ? "bg-yellow-100 text-yellow-700"
                                                : topMethod?.[0] === "card" ? "bg-blue-100 text-blue-700"
                                                : "bg-purple-100 text-purple-700"
                                              }`}>
                                                {topMethod?.[0] || "N/A"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="h-2 rounded-full bg-[#67C090]" style={{ width: `${(cashier.revenue / maxRevenue) * 100}%` }} />
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
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Cashier Reports Tab */}
                {activeTab === "cashiers" && (
                  <div className="space-y-4 sm:space-y-6">
                    {cashierReportView === "list" ? (
                      <>
                        {/* Header & Date Range */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-[#124170] text-lg sm:text-xl">Cashier Performance Report</h3>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Detailed analysis of each cashier's sales activity and performance
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                <input
                                  type="date"
                                  value={cashierDateRange.from}
                                  onChange={(e) => setCashierDateRange({ ...cashierDateRange, from: e.target.value })}
                                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                <input
                                  type="date"
                                  value={cashierDateRange.to}
                                  onChange={(e) => setCashierDateRange({ ...cashierDateRange, to: e.target.value })}
                                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Search & Export */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Search cashiers by name, role, or department..."
                              value={cashierSearch}
                              onChange={(e) => setCashierSearch(e.target.value)}
                              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                            />
                          </div>
                          <button
                            onClick={exportCashierReportCSV}
                            className="px-4 py-2.5 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm whitespace-nowrap"
                          >
                            Export CSV
                          </button>
                        </div>

                        {cashierLoading ? (
                          <div className="text-center py-12">
                            <svg className="w-12 h-12 mx-auto text-[#124170] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <p className="mt-2 text-gray-500">Loading cashier data...</p>
                          </div>
                        ) : (
                          <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Cashiers</p>
                                <p className="text-lg sm:text-2xl font-bold text-[#124170]">{cashierReportData.length}</p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Revenue</p>
                                <p className="text-lg sm:text-2xl font-bold text-green-600">
                                  ₵{cashierReportData.reduce((s, c) => s + c.revenue, 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Best Performer</p>
                                <p className="text-sm sm:text-base font-bold text-[#124170] truncate">
                                  {cashierReportData[0]?.name || "N/A"}
                                </p>
                                <p className="text-xs text-green-600 font-medium">
                                  {cashierReportData[0] ? `₵${cashierReportData[0].revenue.toLocaleString()}` : ""}
                                </p>
                              </div>
                              <div className="bg-white rounded-lg border p-3 sm:p-4">
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Transactions</p>
                                <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                                  {cashierReportData.reduce((s, c) => s + c.transactions, 0).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {filteredCashierData.length === 0 ? (
                              <div className="text-center py-12 text-gray-500">
                                <p>No cashier data found for this period</p>
                                <p className="text-xs text-gray-400 mt-1">Try selecting a different date range</p>
                              </div>
                            ) : (
                              <>
                                {/* Mobile Card View */}
                                <div className="lg:hidden space-y-3">
                                  {filteredCashierData.map((cashier) => {
                                    const maxRevenue = cashierReportData[0]?.revenue || 1;
                                    return (
                                      <div key={cashier.name} className="bg-white border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-full bg-[#124170] text-white flex items-center justify-center text-sm font-bold">
                                              {cashier.name.charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                              <p className="font-semibold text-[#124170]">{cashier.name}</p>
                                              <p className="text-xs text-gray-500">
                                                {cashier.employee?.role || "N/A"} {cashier.employee?.department ? `- ${cashier.employee.department}` : ""}
                                              </p>
                                            </div>
                                          </div>
                                          <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                            cashier.employee?.status === "inactive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                          }`}>
                                            {cashier.employee?.status === "inactive" ? "Inactive" : "Active"}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
                                          <div className="bg-green-50 rounded p-2">
                                            <p className="text-[10px] text-gray-500 uppercase">Revenue</p>
                                            <p className="font-bold text-green-600">₵{cashier.revenue.toLocaleString()}</p>
                                          </div>
                                          <div className="bg-blue-50 rounded p-2">
                                            <p className="text-[10px] text-gray-500 uppercase">Sales</p>
                                            <p className="font-bold text-blue-600">{cashier.transactions}</p>
                                          </div>
                                          <div className="bg-purple-50 rounded p-2">
                                            <p className="text-[10px] text-gray-500 uppercase">Avg Sale</p>
                                            <p className="font-bold text-purple-600">₵{cashier.transactions > 0 ? (cashier.revenue / cashier.transactions).toFixed(0) : "0"}</p>
                                          </div>
                                        </div>
                                        {/* Performance bar */}
                                        <div className="mb-3">
                                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Performance</span>
                                            <span>{((cashier.revenue / maxRevenue) * 100).toFixed(0)}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="h-2 rounded-full bg-[#67C090]" style={{ width: `${(cashier.revenue / maxRevenue) * 100}%` }} />
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => { setSelectedCashierName(cashier.name); setCashierReportView("detail"); }}
                                          className="w-full px-3 py-2 text-sm text-[#124170] border border-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition"
                                        >
                                          View Details
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto border rounded-lg">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Cashier</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600"># Transactions</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Total Revenue</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600">Avg Sale</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Top Payment</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600">Performance</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {filteredCashierData.map((cashier) => {
                                        const topMethod = Object.entries(cashier.payments).sort((a, b) => b[1].total - a[1].total)[0];
                                        const maxRevenue = cashierReportData[0]?.revenue || 1;
                                        return (
                                          <tr key={cashier.name} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-[#124170] text-white flex items-center justify-center text-sm font-bold">
                                                  {cashier.name.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="font-medium text-[#124170]">{cashier.name}</span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{cashier.employee?.role || "N/A"}</td>
                                            <td className="px-4 py-3 text-gray-600">{cashier.employee?.department || "N/A"}</td>
                                            <td className="px-4 py-3 text-right font-medium">{cashier.transactions}</td>
                                            <td className="px-4 py-3 text-right font-bold text-green-600">₵{cashier.revenue.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right">₵{cashier.transactions > 0 ? (cashier.revenue / cashier.transactions).toFixed(2) : "0.00"}</td>
                                            <td className="px-4 py-3 text-center">
                                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                                topMethod?.[0] === "cash" ? "bg-green-100 text-green-700"
                                                : topMethod?.[0] === "momo" ? "bg-yellow-100 text-yellow-700"
                                                : topMethod?.[0] === "card" ? "bg-blue-100 text-blue-700"
                                                : "bg-purple-100 text-purple-700"
                                              }`}>
                                                {topMethod?.[0] || "N/A"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                cashier.employee?.status === "inactive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                              }`}>
                                                {cashier.employee?.status === "inactive" ? "Inactive" : "Active"}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="w-full bg-gray-200 rounded-full h-2 min-w-[80px]">
                                                <div className="h-2 rounded-full bg-[#67C090]" style={{ width: `${(cashier.revenue / maxRevenue) * 100}%` }} />
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <button
                                                onClick={() => { setSelectedCashierName(cashier.name); setCashierReportView("detail"); }}
                                                className="px-3 py-1.5 text-xs text-[#124170] border border-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition"
                                              >
                                                View Details
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      /* Detail View */
                      selectedCashierDetail && (
                        <div className="space-y-6">
                          {/* Back Button */}
                          <button
                            onClick={() => { setCashierReportView("list"); setSelectedCashierName(null); }}
                            className="flex items-center gap-2 text-sm text-[#124170] hover:text-[#67C090] transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Cashier List
                          </button>

                          {/* Profile Header */}
                          <div className="bg-white border rounded-lg p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              <span className="w-16 h-16 rounded-full bg-[#124170] text-white flex items-center justify-center text-2xl font-bold">
                                {selectedCashierDetail.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="text-xl font-bold text-[#124170]">{selectedCashierDetail.name}</h3>
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                    selectedCashierDetail.employee?.status === "inactive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                  }`}>
                                    {selectedCashierDetail.employee?.status === "inactive" ? "Inactive" : "Active"}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {selectedCashierDetail.employee?.role || "N/A"} {selectedCashierDetail.employee?.department ? `- ${selectedCashierDetail.employee.department}` : ""}
                                </p>
                                {selectedCashierDetail.employee && (
                                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                                    {selectedCashierDetail.employee.email && <span>{selectedCashierDetail.employee.email}</span>}
                                    {selectedCashierDetail.employee.phone && <span>{selectedCashierDetail.employee.phone}</span>}
                                    {selectedCashierDetail.employee.dateOfEmployment && (
                                      <span>Joined: {new Date(selectedCashierDetail.employee.dateOfEmployment).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Performance Summary Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                            <div className="bg-white rounded-lg border p-3 sm:p-4">
                              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Transactions</p>
                              <p className="text-lg sm:text-2xl font-bold text-[#124170]">{selectedCashierDetail.transactions}</p>
                            </div>
                            <div className="bg-white rounded-lg border p-3 sm:p-4">
                              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Total Revenue</p>
                              <p className="text-lg sm:text-2xl font-bold text-green-600">₵{selectedCashierDetail.revenue.toLocaleString()}</p>
                            </div>
                            <div className="bg-white rounded-lg border p-3 sm:p-4">
                              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Avg Sale</p>
                              <p className="text-lg sm:text-2xl font-bold text-[#124170]">
                                ₵{selectedCashierDetail.transactions > 0 ? (selectedCashierDetail.revenue / selectedCashierDetail.transactions).toFixed(2) : "0.00"}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg border p-3 sm:p-4">
                              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Items Sold</p>
                              <p className="text-lg sm:text-2xl font-bold text-[#124170]">{selectedCashierDetail.totalItems.toLocaleString()}</p>
                            </div>
                            <div className="bg-white rounded-lg border p-3 sm:p-4">
                              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Top Payment</p>
                              <p className="text-lg sm:text-2xl font-bold text-[#124170] capitalize">
                                {Object.entries(selectedCashierDetail.payments).sort((a, b) => b[1].total - a[1].total)[0]?.[0] || "N/A"}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg border p-3 sm:p-4">
                              <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Busiest Day</p>
                              <p className="text-sm sm:text-base font-bold text-[#124170]">
                                {(() => {
                                  const daily = Object.values(selectedCashierDetail.dailySales);
                                  if (daily.length === 0) return "N/A";
                                  const busiest = daily.sort((a, b) => b.revenue - a.revenue)[0];
                                  return new Date(busiest.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                                })()}
                              </p>
                            </div>
                          </div>

                          {/* Daily Sales Table */}
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="p-3 sm:p-4 border-b">
                              <h4 className="font-medium text-[#124170]">Daily Sales Breakdown</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600"># Transactions</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {Object.values(selectedCashierDetail.dailySales)
                                    .sort((a, b) => b.date.localeCompare(a.date))
                                    .map((day) => (
                                      <tr key={day.date} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-700">{new Date(day.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</td>
                                        <td className="px-4 py-3 text-right font-medium">{day.transactions}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-600">₵{day.revenue.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Payment Method Breakdown */}
                          <div className="bg-white rounded-lg border p-4 sm:p-6">
                            <h4 className="font-medium text-[#124170] mb-4">Payment Method Breakdown</h4>
                            {Object.keys(selectedCashierDetail.payments).length === 0 ? (
                              <p className="text-gray-500 text-sm">No payment data available</p>
                            ) : (
                              <div className="space-y-3">
                                {Object.entries(selectedCashierDetail.payments)
                                  .sort((a, b) => b[1].total - a[1].total)
                                  .map(([method, data]) => {
                                    const percentage = selectedCashierDetail.revenue > 0 ? (data.total / selectedCashierDetail.revenue) * 100 : 0;
                                    return (
                                      <div key={method}>
                                        <div className="flex justify-between items-center mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                              method === "cash" ? "bg-green-100 text-green-700"
                                              : method === "momo" ? "bg-yellow-100 text-yellow-700"
                                              : method === "card" ? "bg-blue-100 text-blue-700"
                                              : "bg-purple-100 text-purple-700"
                                            }`}>
                                              {method}
                                            </span>
                                            <span className="text-xs text-gray-500">{data.count} transactions</span>
                                          </div>
                                          <span className="font-medium text-sm">₵{data.total.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                          <div
                                            className={`h-2.5 rounded-full ${
                                              method === "cash" ? "bg-green-500"
                                              : method === "momo" ? "bg-yellow-500"
                                              : method === "card" ? "bg-blue-500"
                                              : "bg-purple-500"
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>

                          {/* Top Products Sold */}
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="p-3 sm:p-4 border-b">
                              <h4 className="font-medium text-[#124170]">Top Products Sold</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600">Qty Sold</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {Object.values(selectedCashierDetail.productsSold)
                                    .sort((a, b) => b.revenue - a.revenue)
                                    .slice(0, 15)
                                    .map((product, idx) => (
                                      <tr key={product.name} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-[#124170]">{product.name}</td>
                                        <td className="px-4 py-3 text-right">{product.qty}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-600">₵{product.revenue.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Recent Transactions */}
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="p-3 sm:p-4 border-b">
                              <h4 className="font-medium text-[#124170]">Recent Transactions (Last 10)</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Receipt #</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600">Items</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                                    <th className="px-4 py-3 text-center font-medium text-gray-600">Payment</th>
                                    <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {selectedCashierDetail.sales
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .slice(0, 10)
                                    .map((sale) => (
                                      <tr key={sale._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs text-[#124170]">{sale._id.slice(-8).toUpperCase()}</td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{new Date(sale.createdAt).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">{sale.items.length}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-600">₵{sale.total.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                            sale.paymentMethod === "cash" ? "bg-green-100 text-green-700"
                                            : sale.paymentMethod === "momo" ? "bg-yellow-100 text-yellow-700"
                                            : sale.paymentMethod === "card" ? "bg-blue-100 text-blue-700"
                                            : "bg-purple-100 text-purple-700"
                                          }`}>
                                            {sale.paymentMethod}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <button
                                            onClick={() => setSelectedPosSale(sale)}
                                            className="text-xs text-[#124170] hover:text-[#67C090] underline"
                                          >
                                            View
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </div>

        {/* Stock Report Product Detail Modal */}
        {selectedReportProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-4 bg-[#124170] text-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">{selectedReportProduct.name}</h2>
                    <p className="text-sm text-white/70">{selectedReportProduct.barcode}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedReportProduct(null); setProductMovements([]); }}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
                    <h3 className="font-semibold text-[#124170] mb-4">Product Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{selectedReportProduct.category || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Cost Price</span><span className="font-medium">₵{selectedReportProduct.costPrice.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Selling Price</span><span className="font-medium">₵{selectedReportProduct.sellingPrice.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Profit Margin</span><span className="font-medium text-green-600">{(((selectedReportProduct.sellingPrice - selectedReportProduct.costPrice) / selectedReportProduct.costPrice) * 100).toFixed(1)}%</span></div>
                    </div>
                  </div>
                  <div className="bg-[#DDF4E7] rounded-xl p-4 sm:p-5">
                    <h3 className="font-semibold text-[#124170] mb-4">Stock Summary</h3>
                    <div className="text-xs text-gray-500 mb-3">Period: {new Date(reportDateRange.from).toLocaleDateString()} - {new Date(reportDateRange.to).toLocaleDateString()}</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-gray-600">Opening Stock</span>
                        <div className="text-right"><span className="font-bold text-[#124170]">{selectedReportProduct.openingStock.qty}</span><span className="text-gray-500 text-sm ml-2">₵{selectedReportProduct.openingStock.amount.toFixed(2)}</span></div>
                      </div>
                      <div className="flex justify-between items-center bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-green-600">+ Purchases</span>
                        <div className="text-right"><span className="font-bold text-green-600">+{selectedReportProduct.purchases.qty}</span><span className="text-gray-500 text-sm ml-2">₵{selectedReportProduct.purchases.amount.toFixed(2)}</span></div>
                      </div>
                      <div className="flex justify-between items-center bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-orange-600">- Consumption</span>
                        <div className="text-right"><span className="font-bold text-orange-600">-{selectedReportProduct.consumption.qty}</span><span className="text-gray-500 text-sm ml-2">₵{selectedReportProduct.consumption.amount.toFixed(2)}</span></div>
                      </div>
                      <div className="border-t border-[#124170]/20 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-[#124170]">Closing Stock</span>
                        <div className="text-right"><span className="font-bold text-xl text-[#124170]">{selectedReportProduct.closingStock.qty}</span><span className="text-[#124170] text-sm ml-2">₵{selectedReportProduct.closingStock.amount.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Flow Visualization */}
                <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
                  <h3 className="font-semibold text-[#124170] mb-4">Stock Flow</h3>
                  <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-2"><span className="text-lg sm:text-xl font-bold text-blue-700">{selectedReportProduct.openingStock.qty}</span></div>
                      <p className="text-xs text-gray-500">Opening</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2"><span className="text-lg sm:text-xl font-bold text-green-700">+{selectedReportProduct.purchases.qty}</span></div>
                      <p className="text-xs text-gray-500">Purchases</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-2"><span className="text-lg sm:text-xl font-bold text-purple-700">{selectedReportProduct.balance.qty}</span></div>
                      <p className="text-xs text-gray-500">Balance</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-2"><span className="text-lg sm:text-xl font-bold text-orange-700">-{selectedReportProduct.consumption.qty}</span></div>
                      <p className="text-xs text-gray-500">Sold</p>
                    </div>
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <div className="text-center flex-shrink-0 min-w-[80px]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#124170] flex items-center justify-center mb-2"><span className="text-lg sm:text-xl font-bold text-white">{selectedReportProduct.closingStock.qty}</span></div>
                      <p className="text-xs text-gray-500">Closing</p>
                    </div>
                  </div>
                </div>

                {/* Transaction History */}
                <div>
                  <h3 className="font-semibold text-[#124170] mb-4">
                    Transaction History
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      ({new Date(reportDateRange.from).toLocaleDateString()} - {new Date(reportDateRange.to).toLocaleDateString()})
                    </span>
                  </h3>
                  {productMovementsLoading ? (
                    <div className="text-center py-8">
                      <svg className="w-8 h-8 mx-auto text-[#124170] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Loading transactions...</p>
                    </div>
                  ) : productMovements.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No transactions found for this period</p>
                      <p className="text-xs text-gray-400 mt-1">Try selecting a different date range</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">Date & Time</th>
                            <th className="px-4 py-3 text-center">Type</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">Batch</th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">Reason</th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">Performed By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {productMovements.map((movement) => (
                            <tr key={movement._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">{new Date(movement.createdAt).toLocaleString()}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  movement.type === "in" ? "bg-green-100 text-green-700"
                                  : movement.type === "out" ? "bg-red-100 text-red-700"
                                  : movement.type === "return" ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                                }`}>
                                  {movement.type === "in" && "Stock In"}
                                  {movement.type === "out" && "Stock Out"}
                                  {movement.type === "adjustment" && "Adjustment"}
                                  {movement.type === "return" && "Return"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold ${movement.type === "in" || movement.type === "return" ? "text-green-600" : "text-red-600"}`}>
                                  {movement.type === "in" || movement.type === "return" ? "+" : "-"}{movement.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{movement.batchNumber || "—"}</td>
                              <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{movement.reason || "—"}</td>
                              <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{movement.performedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t flex-shrink-0">
                <button
                  onClick={() => { setSelectedReportProduct(null); setProductMovements([]); }}
                  className="w-full px-4 py-2.5 border rounded-lg hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POS Sale Detail Modal */}
        {selectedPosSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-4 bg-[#124170] text-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">Receipt #{selectedPosSale._id.slice(-8).toUpperCase()}</h2>
                    <p className="text-sm text-white/70">{new Date(selectedPosSale.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPosSale(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Sale Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Store Type</p>
                    <p className="font-medium text-[#124170] capitalize">{selectedPosSale.storeType}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Cashier</p>
                    <p className="font-medium text-[#124170]">{selectedPosSale.cashier || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Payment Method</p>
                    <p className="font-medium text-[#124170] capitalize">{selectedPosSale.paymentMethod}</p>
                  </div>
                </div>

                {/* Customer Info */}
                {selectedPosSale.customer && selectedPosSale.customer.name && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-700 mb-2">Customer Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div><span className="text-gray-500">Name:</span> <span className="font-medium">{selectedPosSale.customer.name}</span></div>
                      {selectedPosSale.customer.phone && <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedPosSale.customer.phone}</span></div>}
                      {selectedPosSale.customer.email && <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedPosSale.customer.email}</span></div>}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <h4 className="font-medium text-[#124170] mb-3">Items ({selectedPosSale.items.length})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Product</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600">Price</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-600">Qty</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedPosSale.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{item.name}</td>
                            <td className="px-4 py-2 text-right text-gray-600">₵{item.unitPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-right font-medium">₵{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-[#DDF4E7] rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">₵{selectedPosSale.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">₵{selectedPosSale.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#124170]/20 pt-2 text-lg font-bold text-[#124170]">
                      <span>Total</span>
                      <span>₵{selectedPosSale.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-gray-600">Amount Paid</span>
                      <span className="font-medium">₵{selectedPosSale.amountPaid.toFixed(2)}</span>
                    </div>
                    {selectedPosSale.change > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Change</span>
                        <span className="font-medium text-green-600">₵{selectedPosSale.change.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Details for split */}
                  {selectedPosSale.paymentMethod === "split" && (
                    <div className="mt-3 pt-3 border-t border-[#124170]/20">
                      <p className="text-xs text-gray-500 uppercase mb-2">Payment Split</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white/60 rounded p-2 text-center">
                          <p className="text-xs text-gray-500">Cash</p>
                          <p className="font-bold text-green-600">₵{selectedPosSale.paymentDetails.cash.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/60 rounded p-2 text-center">
                          <p className="text-xs text-gray-500">MoMo</p>
                          <p className="font-bold text-yellow-600">₵{selectedPosSale.paymentDetails.momo.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/60 rounded p-2 text-center">
                          <p className="text-xs text-gray-500">Card</p>
                          <p className="font-bold text-blue-600">₵{selectedPosSale.paymentDetails.card.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t flex-shrink-0">
                <button
                  onClick={() => setSelectedPosSale(null)}
                  className="w-full px-4 py-2.5 border rounded-lg hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employee Detail Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-4 sm:px-6 py-4 bg-[#124170] text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedEmployee.name}</h2>
                  <p className="text-sm text-white/70">{selectedEmployee.role} - {selectedEmployee.department || "No Department"}</p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Email Address</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.email}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Phone Number</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.phone || "Not provided"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.address || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Employment Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.role}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.department || "Not assigned"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Date of Employment</p>
                      <p className="font-medium text-[#124170]">
                        {selectedEmployee.dateOfEmployment
                          ? new Date(selectedEmployee.dateOfEmployment).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Years of Service</p>
                      <p className="font-medium text-[#124170]">
                        {selectedEmployee.dateOfEmployment
                          ? getYearsOfService(selectedEmployee.dateOfEmployment)
                          : "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600">Monthly Salary</p>
                      <p className="text-xl font-bold text-blue-700">
                        ₵{selectedEmployee.salary?.toLocaleString() || "Not set"}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-xs text-green-600">Annual Salary</p>
                      <p className="text-xl font-bold text-green-700">
                        ₵{selectedEmployee.salary ? (selectedEmployee.salary * 12).toLocaleString() : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Contact Name</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.emergencyContact || "Not provided"}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Contact Phone</p>
                      <p className="font-medium text-[#124170]">{selectedEmployee.emergencyPhone || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500">Employment Status:</span>
                      <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                        selectedEmployee.status === "inactive"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {selectedEmployee.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 bg-gray-50 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="w-full sm:flex-1 px-4 py-2.5 border rounded-lg hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => exportEmployeeReport(selectedEmployee)}
                  className="w-full sm:flex-1 px-4 py-2.5 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] text-sm"
                >
                  Print Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Tax Calculator Component
function TaxCalculator() {
  const [income, setIncome] = useState("");
  const [taxType, setTaxType] = useState("vat");
  const [customRate, setCustomRate] = useState("");

  const taxRates: Record<string, number> = {
    vat: 15, // Ghana VAT rate
    income: 25, // Corporate income tax
    withholding: 5,
    custom: parseFloat(customRate) || 0,
  };

  const taxableAmount = parseFloat(income) || 0;
  const rate = taxRates[taxType];
  const taxAmount = (taxableAmount * rate) / 100;
  const netAmount = taxableAmount - taxAmount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Taxable Amount (₵)
          </label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="Enter amount"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Tax Type</label>
          <select
            value={taxType}
            onChange={(e) => setTaxType(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
          >
            <option value="vat">VAT (15%)</option>
            <option value="income">Corporate Income Tax (25%)</option>
            <option value="withholding">Withholding Tax (5%)</option>
            <option value="custom">Custom Rate</option>
          </select>
        </div>

        {taxType === "custom" && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Custom Rate (%)
            </label>
            <input
              type="number"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              placeholder="Enter rate"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
            />
          </div>
        )}
      </div>

      <div className="bg-[#F4F7F6] rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-[#124170]">Calculation Result</h3>

        <div className="flex justify-between py-2 border-b text-sm">
          <span className="text-gray-600">Taxable Amount</span>
          <span className="font-medium">₵{taxableAmount.toLocaleString()}</span>
        </div>

        <div className="flex justify-between py-2 border-b text-sm">
          <span className="text-gray-600">Tax Rate</span>
          <span className="font-medium">{rate}%</span>
        </div>

        <div className="flex justify-between py-2 border-b text-sm">
          <span className="text-gray-600">Tax Amount</span>
          <span className="font-medium text-yellow-600">
            ₵{taxAmount.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between py-2 pt-2 text-sm">
          <span className="font-semibold">Net After Tax</span>
          <span className="font-bold text-[#124170]">
            ₵{netAmount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
