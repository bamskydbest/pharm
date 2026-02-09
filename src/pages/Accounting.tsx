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

type Tab = "sales" | "accounting" | "taxes";

export default function Accounting() {
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

  // Filters
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [filterType] = useState("");

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
        }
      } catch (error) {
        console.error("Failed to fetch accounting data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, dateRange]);

  const filteredLedger = useMemo(() => {
    if (!filterType) return ledger;
    return ledger.filter((l) => l.type === filterType);
  }, [ledger, filterType]);

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

  const tabs: { id: Tab; label: string; shortLabel: string }[] = [
    { id: "sales", label: "Sales Reports", shortLabel: "Sales" },
    { id: "accounting", label: "Accounting", shortLabel: "Accounting" },
    { id: "taxes", label: "Tax Records", shortLabel: "Taxes" },
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function TaxCalculator() {
  const [income, setIncome] = useState("");
  const [taxType, setTaxType] = useState("vat");
  const [customRate, setCustomRate] = useState("");

  const taxRates: Record<string, number> = {
    vat: 15,
    income: 25,
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
