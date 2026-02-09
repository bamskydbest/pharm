import { useEffect, useState, useMemo } from "react";
import api from "../components/services/api";
import { useAuthStore } from "../components/store/authStore";
import Sidebar from "./Sidebar";

type Customer = {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  loyaltyPoints: number;
  totalSpent: number;
  purchaseCount: number;
  lastVisit: string;
  createdAt: string;
};

type SortField = "name" | "totalSpent" | "loyaltyPoints" | "lastVisit" | "purchaseCount";
type SortOrder = "asc" | "desc";

export default function Customers() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "User";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [minSpent, setMinSpent] = useState("");
  const [maxSpent, setMaxSpent] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minPoints, setMinPoints] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Fetch customers
  useEffect(() => {
    setLoading(true);
    api
      .get<Customer[]>("/customers")
      .then((res) => {
        setCustomers(res.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load customers");
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Filter by name
    if (searchName) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    // Filter by phone
    if (searchPhone) {
      result = result.filter((c) => c.phone.includes(searchPhone));
    }

    // Filter by amount spent
    if (minSpent) {
      result = result.filter((c) => c.totalSpent >= parseFloat(minSpent));
    }
    if (maxSpent) {
      result = result.filter((c) => c.totalSpent <= parseFloat(maxSpent));
    }

    // Filter by loyalty points
    if (minPoints) {
      result = result.filter((c) => c.loyaltyPoints >= parseInt(minPoints));
    }

    // Filter by date range (last visit)
    if (dateFrom) {
      result = result.filter(
        (c) => new Date(c.lastVisit) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      result = result.filter((c) => new Date(c.lastVisit) <= new Date(dateTo));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "totalSpent":
          comparison = a.totalSpent - b.totalSpent;
          break;
        case "loyaltyPoints":
          comparison = a.loyaltyPoints - b.loyaltyPoints;
          break;
        case "lastVisit":
          comparison =
            new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();
          break;
        case "purchaseCount":
          comparison = a.purchaseCount - b.purchaseCount;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    customers,
    searchName,
    searchPhone,
    minSpent,
    maxSpent,
    dateFrom,
    dateTo,
    minPoints,
    sortField,
    sortOrder,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchPhone, minSpent, maxSpent, dateFrom, dateTo, minPoints]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Name",
      "Phone",
      "Email",
      "Address",
      "Notes",
      "Loyalty Points",
      "Total Spent",
      "Purchase Count",
      "Last Visit",
      "Created At",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredCustomers.map((c) =>
        [
          `"${c.name}"`,
          `"${c.phone}"`,
          `"${c.email}"`,
          `"${c.address}"`,
          `"${c.notes?.replace(/"/g, '""') || ""}"`,
          c.loyaltyPoints,
          c.totalSpent,
          c.purchaseCount,
          new Date(c.lastVisit).toLocaleDateString(),
          new Date(c.createdAt).toLocaleDateString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export to PDF
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customers Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #124170; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #124170; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { margin-top: 20px; padding: 10px; background: #f5f5f5; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Customers Report</h1>
        <p class="subtitle">Generated: ${new Date().toLocaleString()} | Total Records: ${filteredCustomers.length}</p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Loyalty Pts</th>
              <th>Total Spent</th>
              <th>Purchases</th>
              <th>Last Visit</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCustomers
              .map(
                (c) => `
              <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.email}</td>
                <td>${c.address}</td>
                <td>${c.loyaltyPoints}</td>
                <td>₵${c.totalSpent.toFixed(2)}</td>
                <td>${c.purchaseCount}</td>
                <td>${new Date(c.lastVisit).toLocaleDateString()}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="summary">
          <strong>Summary:</strong>
          Total Customers: ${filteredCustomers.length} |
          Total Revenue: ₵${filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)} |
          Total Loyalty Points: ${filteredCustomers.reduce((sum, c) => sum + c.loyaltyPoints, 0)}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchName("");
    setSearchPhone("");
    setMinSpent("");
    setMaxSpent("");
    setDateFrom("");
    setDateTo("");
    setMinPoints("");
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="flex bg-[#F4F7F6] min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#124170]">
              Welcome, <span className="text-[#67C090]">{firstName}</span>
            </h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-[#124170]">Filters</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-[#124170] transition"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Name search */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            {/* Phone search */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input
                type="text"
                placeholder="Search by phone..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            {/* Amount spent range */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Amount Spent (Min)
              </label>
              <input
                type="number"
                placeholder="Min ₵"
                value={minSpent}
                onChange={(e) => setMinSpent(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Amount Spent (Max)
              </label>
              <input
                type="number"
                placeholder="Max ₵"
                value={maxSpent}
                onChange={(e) => setMaxSpent(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            {/* Date range */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Last Visit From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Last Visit To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            {/* Loyalty points */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Min Loyalty Points
              </label>
              <input
                type="number"
                placeholder="Min points"
                value={minPoints}
                onChange={(e) => setMinPoints(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            {/* Items per page */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Items per page
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {startIndex + 1}-
            {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of{" "}
            {filteredCustomers.length} customers
          </span>
          <span>
            Total Revenue: ₵
            {filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading customers...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No customers found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#124170] text-white">
                  <tr>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-[#0d2f52] transition"
                      onClick={() => handleSort("name")}
                    >
                      Name <SortIndicator field="name" />
                    </th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">
                      Address
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-[#0d2f52] transition"
                      onClick={() => handleSort("loyaltyPoints")}
                    >
                      Loyalty Pts <SortIndicator field="loyaltyPoints" />
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-[#0d2f52] transition"
                      onClick={() => handleSort("totalSpent")}
                    >
                      Total Spent <SortIndicator field="totalSpent" />
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-[#0d2f52] transition"
                      onClick={() => handleSort("purchaseCount")}
                    >
                      Purchases <SortIndicator field="purchaseCount" />
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-[#0d2f52] transition"
                      onClick={() => handleSort("lastVisit")}
                    >
                      Last Visit <SortIndicator field="lastVisit" />
                    </th>
                    <th className="px-4 py-3 text-left hidden xl:table-cell">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCustomers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-[#124170]">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {customer.email}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[150px] truncate">
                        {customer.address}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#DDF4E7] text-[#124170]">
                          {customer.loyaltyPoints}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₵{customer.totalSpent.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {customer.purchaseCount}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(customer.lastVisit).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden xl:table-cell max-w-[150px] truncate">
                        {customer.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm transition ${
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
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
