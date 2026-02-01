import { useEffect, useState } from "react";
import StatCard from "../components/forms/StatCard";
import SalesChart from "../components/charts/SalesChart";
import api from "../components/services/api";
import SalesPieChart from "./SalesPiechart";
import Sidebar from "./Sidebar";
// import Sidebar from "../components/Sidebar";
// import SalesPieChart from "../components/charts/SalesPieChart";

type DashboardStats = {
  todaySales: number;
  lowStock: number;
  employees: number;
  branches: number;
};

type RecentSale = {
  _id: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    api.get("/dashboard/stats").then((res) => setStats(res.data));
    api.get("/dashboard/recent-sales").then((res) => setRecentSales(res.data));
    api.get("/reports/sales").then((res) => setChartData(res.data));
  }, []);

  return (
    <div className="flex bg-[#F4F7F6] min-h-screen">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold text-[#124170]">
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Today Sales" value={`₵${stats?.todaySales ?? "—"}`} />
          <StatCard title="Low Stock Items" value={stats?.lowStock ?? "—"} />
          <StatCard title="Employees" value={stats?.employees ?? "—"} />
          <StatCard title="Branches" value={stats?.branches ?? "—"} />
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-medium mb-4">Sales Trend</h2>
            <SalesChart data={chartData} />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-medium mb-4">Payment Breakdown</h2>
            <SalesPieChart data={recentSales} />
          </div>
        </div>

        {/* LOWER GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RECENT SALES */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-medium mb-4">Recent Sales</h2>

            {recentSales.length === 0 ? (
              <p className="text-sm text-gray-500">No recent sales</p>
            ) : (
              <ul className="divide-y">
                {recentSales.map((sale) => (
                  <li key={sale._id} className="flex justify-between py-3 text-sm">
                    <span>
                      ₵{sale.total} • {sale.paymentMethod}
                    </span>
                    <span className="text-gray-400">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ALERTS */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="font-medium mb-4">System Alerts</h2>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded bg-yellow-50 border border-yellow-200">
                ⚠️ Some items are running low on stock
              </div>

              <div className="p-3 rounded bg-blue-50 border border-blue-200">
                ℹ️ Remember to reconcile daily sales
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
