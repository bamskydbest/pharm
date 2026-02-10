import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SalesChart from "../components/charts/SalesChart";
import api from "../components/services/api";
import { useAuthStore } from "../components/store/authStore";
import SalesPieChart from "./SalesPiechart";
import Sidebar from "./Sidebar";

type Sale = {
  _id: string;
  subtotal: number;
  total?: number;
  paymentMethod: string;
  soldBy?: { id: string; name: string };
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  createdAt: string;
};

type EmployeeStats = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalPayroll: number;
  avgSalary: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
};

type InventoryStats = {
  totalProducts: number;
  totalValue: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
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

type AttendanceSummary = {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "User";
  const [loading, setLoading] = useState(true);

  const [sales, setSales] = useState<Sale[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    const fetchAll = async () => {
      const results = await Promise.allSettled([
        api.get<Sale[]>("/sales", { params: { from: today, to: today } }),
        api.get("/reports/sales", { params: { from: thirtyDaysAgo, to: today } }),
        api.get<EmployeeStats>("/employees/stats/summary"),
        api.get<InventoryStats>("/inventory/stats"),
        api.get<FinancialSummary>("/accounting/summary", { params: { from: monthStart, to: today } }),
        api.get<AttendanceSummary>("/attendance/summary/today"),
      ]);

      if (results[0].status === "fulfilled") setSales(Array.isArray(results[0].value.data) ? results[0].value.data : []);
      if (results[1].status === "fulfilled") setChartData(Array.isArray(results[1].value.data) ? results[1].value.data : []);
      if (results[2].status === "fulfilled") setEmployeeStats(results[2].value.data);
      if (results[3].status === "fulfilled") setInventoryStats(results[3].value.data);
      if (results[4].status === "fulfilled") setFinancialSummary(results[4].value.data);
      if (results[5].status === "fulfilled") setAttendance(results[5].value.data);

      setLoading(false);
    };

    fetchAll();
  }, []);

  const todayRevenue = sales.reduce((sum, s) => sum + (s.subtotal || s.total || 0), 0);

  // Receipt lookup
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<Sale[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const handleLookup = async () => {
    if (lookupQuery.trim().length < 3) return;
    setLookupLoading(true);
    setHasSearched(true);
    try {
      const { data } = await api.get<Sale[]>("/sales/lookup", {
        params: { q: lookupQuery.trim() },
      });
      setLookupResults(data);
    } catch {
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="flex bg-[#F4F7F6] min-h-screen">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-x-hidden">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#124170]">
              Welcome, <span className="text-[#67C090]">{firstName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/admin/create-user")}
              className="px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm"
            >
              + Create Staff
            </button>
            <button
              onClick={() => navigate("/pos")}
              className="px-4 py-2 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
            >
              Open POS
            </button>
            <button
              onClick={() => navigate("/reports")}
              className="px-4 py-2 border border-[#124170] text-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition text-sm"
            >
              View Reports
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-[#124170] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="mt-3 text-gray-500 text-sm">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Today's Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">₵{todayRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400 mt-1">{sales.length} transaction{sales.length !== 1 ? "s" : ""}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-[#124170]">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Employees</p>
                <p className="text-lg sm:text-2xl font-bold text-[#124170] mt-1">{employeeStats?.activeEmployees ?? "—"}</p>
                <p className="text-[10px] text-gray-400 mt-1">{employeeStats ? `${employeeStats.inactiveEmployees} inactive` : ""}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Low Stock</p>
                <p className={`text-lg sm:text-2xl font-bold mt-1 ${(inventoryStats?.lowStock ?? 0) > 0 ? "text-yellow-600" : "text-gray-700"}`}>
                  {inventoryStats?.lowStock ?? "—"}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{inventoryStats ? `${inventoryStats.totalProducts} total products` : ""}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Expiring Soon</p>
                <p className={`text-lg sm:text-2xl font-bold mt-1 ${(inventoryStats?.expiringSoon ?? 0) > 0 ? "text-red-500" : "text-gray-700"}`}>
                  {inventoryStats?.expiringSoon ?? "—"}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{inventoryStats?.expired ? `${inventoryStats.expired} expired` : "Within 30 days"}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Net Profit</p>
                <p className={`text-lg sm:text-2xl font-bold mt-1 ${(financialSummary?.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                  ₵{financialSummary?.netProfit?.toLocaleString() ?? "—"}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">This month</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-[#67C090]">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-medium">Monthly Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-[#124170] mt-1">
                  ₵{financialSummary?.totalRevenue?.toLocaleString() ?? "—"}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {financialSummary ? `${financialSummary.profitMargin.toFixed(1)}% margin` : ""}
                </p>
              </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              <div className="xl:col-span-2 bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="font-medium text-[#124170] mb-4">Sales Trend (Last 30 Days)</h2>
                {chartData.length > 0 ? (
                  <SalesChart data={chartData} />
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
                    No sales data available for this period
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="font-medium text-[#124170] mb-4">Payment Breakdown</h2>
                <SalesPieChart data={sales} />
              </div>
            </div>

            {/* LOWER GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* RECENT TRANSACTIONS */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-medium text-[#124170]">Today's Transactions</h2>
                  <button
                    onClick={() => navigate("/reports")}
                    className="text-xs text-[#124170] hover:text-[#67C090] transition"
                  >
                    View All
                  </button>
                </div>
                {sales.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No transactions today
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Receipt</th>
                          <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs">Amount</th>
                          <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs">Payment</th>
                          <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs hidden sm:table-cell">Cashier</th>
                          <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sales
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .slice(0, 10)
                          .map((sale) => (
                            <tr key={sale._id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-mono text-xs text-[#124170]">
                                #{sale._id.slice(-6).toUpperCase()}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                                ₵{(sale.subtotal || sale.total || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                                  sale.paymentMethod?.includes("CASH") ? "bg-green-100 text-green-700"
                                  : sale.paymentMethod?.includes("MOMO") ? "bg-yellow-100 text-yellow-700"
                                  : sale.paymentMethod?.includes("CARD") ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                                }`}>
                                  {sale.paymentMethod}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                                {sale.soldBy?.name || "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                                {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* QUICK OVERVIEW PANEL */}
              <div className="space-y-4">
                {/* Employee Breakdown */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-medium text-[#124170] text-sm">Employee Breakdown</h2>
                    <button
                      onClick={() => navigate("/employees-database")}
                      className="text-xs text-[#124170] hover:text-[#67C090] transition"
                    >
                      Manage
                    </button>
                  </div>
                  {employeeStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(employeeStats.byRole).map(([role, count]) => (
                        <div key={role} className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-lg font-bold text-[#124170]">{count}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{role}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Unable to load employee data</p>
                  )}
                  {employeeStats && (
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                      <span>Total Payroll: <span className="font-semibold text-[#124170]">₵{employeeStats.totalPayroll.toLocaleString()}</span></span>
                      <span>Avg Salary: <span className="font-semibold text-[#124170]">₵{employeeStats.avgSalary.toLocaleString()}</span></span>
                    </div>
                  )}
                </div>

                {/* Attendance Today */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="font-medium text-[#124170] text-sm mb-3">Attendance Today</h2>
                  {attendance ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{attendance.presentToday}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Present</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-lg">
                        <p className="text-lg font-bold text-red-500">{attendance.absentToday}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Absent</p>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="text-lg font-bold text-yellow-600">{attendance.lateToday}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Late</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{attendance.onLeaveToday}</p>
                        <p className="text-[10px] text-gray-500 uppercase">On Leave</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Unable to load attendance data</p>
                  )}
                </div>

                {/* Inventory Alerts */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-medium text-[#124170] text-sm">Inventory Alerts</h2>
                    <button
                      onClick={() => navigate("/inventory")}
                      className="text-xs text-[#124170] hover:text-[#67C090] transition"
                    >
                      View Inventory
                    </button>
                  </div>
                  {inventoryStats ? (
                    <div className="space-y-2">
                      {inventoryStats.lowStock > 0 && (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-yellow-600 text-sm font-bold">{inventoryStats.lowStock}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Low Stock Items</p>
                            <p className="text-[10px] text-yellow-600">Products below reorder level</p>
                          </div>
                        </div>
                      )}
                      {inventoryStats.expiringSoon > 0 && (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-red-600 text-sm font-bold">{inventoryStats.expiringSoon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-800">Expiring Soon</p>
                            <p className="text-[10px] text-red-600">Products expiring within 30 days</p>
                          </div>
                        </div>
                      )}
                      {inventoryStats.expired > 0 && (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-600 text-sm font-bold">{inventoryStats.expired}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Expired Products</p>
                            <p className="text-[10px] text-gray-500">Require immediate attention</p>
                          </div>
                        </div>
                      )}
                      {inventoryStats.lowStock === 0 && inventoryStats.expiringSoon === 0 && inventoryStats.expired === 0 && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
                          <p className="text-sm font-medium text-green-700">All clear! No inventory alerts.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Unable to load inventory data</p>
                  )}
                </div>
              </div>
            </div>

            {/* RECEIPT LOOKUP */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-[#124170]">Receipt Lookup</h2>
                <p className="text-xs text-gray-400">Search by receipt ID from printed receipt</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter receipt ID (e.g. A1B2C3)..."
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090] font-mono uppercase"
                />
                <button
                  onClick={handleLookup}
                  disabled={lookupLoading || lookupQuery.trim().length < 3}
                  className="px-5 py-2.5 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm font-medium disabled:opacity-50"
                >
                  {lookupLoading ? "Searching..." : "Search"}
                </button>
              </div>

              {lookupResults.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Receipt #</th>
                        <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs">Amount</th>
                        <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs">Payment</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs hidden sm:table-cell">Sold By</th>
                        <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs">Date</th>
                        <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lookupResults.map((sale) => (
                        <tr key={sale._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-[#124170] font-semibold">
                            #{sale._id.slice(-8).toUpperCase()}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                            ₵{(sale.subtotal || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-gray-100 text-gray-700">
                              {sale.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                            {sale.soldBy?.name || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                            {new Date(sale.createdAt).toLocaleString([], {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => setSelectedSale(sale)}
                              className="text-xs text-[#124170] hover:text-[#67C090] font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {lookupResults.length === 0 && hasSearched && !lookupLoading && (
                <p className="mt-4 text-center text-sm text-gray-400">No receipts found matching "{lookupQuery}"</p>
              )}
            </div>

            {/* QUICK NAVIGATION */}
            <div>
              <h2 className="font-medium text-[#124170] mb-3 text-sm uppercase tracking-wide">Quick Navigation</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "POS", to: "/pos", color: "bg-green-50 text-green-700 border-green-200", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" },
                  { label: "Inventory", to: "/inventory", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
                  { label: "Employees", to: "/employees-database", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                  { label: "Reports", to: "/reports", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                  { label: "Customers", to: "/customers", color: "bg-teal-50 text-teal-700 border-teal-200", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
                  { label: "Create Staff", to: "/admin/create-user", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.to)}
                    className={`${item.color} border rounded-lg p-4 hover:shadow-md transition text-center group`}
                  >
                    <svg className="w-6 h-6 mx-auto mb-2 opacity-70 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    <p className="text-sm font-medium">{item.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SALE DETAIL MODAL */}
        {selectedSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-[#124170] text-white flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold">Sale Details</h2>
                  <p className="text-xs text-white/70 font-mono">
                    Receipt #{selectedSale._id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-white/70 hover:text-white text-xl"
                >
                  &times;
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Date & Time</p>
                    <p className="font-medium text-[#124170]">
                      {new Date(selectedSale.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Sold By</p>
                    <p className="font-medium text-[#124170]">
                      {selectedSale.soldBy?.name || "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Payment Method</p>
                    <p className="font-medium text-[#124170] uppercase">
                      {selectedSale.paymentMethod}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 uppercase">Total Amount</p>
                    <p className="font-bold text-green-600 text-lg">
                      ₵{(selectedSale.subtotal || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Full Receipt ID */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Full Receipt ID</p>
                  <p className="font-mono text-xs text-[#124170] break-all select-all">{selectedSale._id}</p>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-sm font-semibold text-[#124170] mb-2">Items Purchased</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedSale.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-xs">{item.name}</td>
                            <td className="px-3 py-2 text-center text-xs">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-xs">₵{(item.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-xs font-medium">₵{(item.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex-shrink-0">
                <button
                  onClick={() => setSelectedSale(null)}
                  className="w-full px-4 py-2.5 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
