import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/services/api";
import Sidebar from "./Sidebar";

type Employee = {
  _id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
};

type PayrollRecord = {
  _id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: "pending" | "paid" | "cancelled";
  paidAt: string | null;
};

type PayrollSummary = {
  totalBaseSalary: number;
  totalBonus: number;
  totalDeductions: number;
  totalTax: number;
  totalNetPay: number;
  paidCount: number;
  pendingCount: number;
};

export default function PayrollManagement() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [filterStatus, setFilterStatus] = useState("");
  const [searchName, setSearchName] = useState("");

  // Bulk payroll modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPayroll, setBulkPayroll] = useState({
    month: new Date().toISOString().slice(0, 7),
    includeBonus: false,
    bonusPercentage: 0,
    taxPercentage: 0,
  });

  // Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Employee[]>("/employees"),
      api.get<PayrollRecord[]>(`/payroll/monthly`, {
        params: { month: selectedMonth },
      }),
      api.get<PayrollSummary>(`/payroll/summary`, {
        params: { month: selectedMonth },
      }),
    ])
      .then(([empRes, payRes, sumRes]) => {
        setEmployees(empRes.data);
        setPayrollRecords(payRes.data);
        setSummary(sumRes.data);
      })
      .catch((err) => {
        console.error("Failed to load payroll data:", err);
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  // Filter records
  const filteredRecords = useMemo(() => {
    let result = payrollRecords;

    if (searchName) {
      result = result.filter((r) =>
        r.employeeName.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (filterStatus) {
      result = result.filter((r) => r.status === filterStatus);
    }

    return result;
  }, [payrollRecords, searchName, filterStatus]);

  // Employees without payroll for this month
  const employeesWithoutPayroll = useMemo(() => {
    const paidEmployeeIds = new Set(payrollRecords.map((p) => p.employeeId));
    return employees.filter((e) => !paidEmployeeIds.has(e._id));
  }, [employees, payrollRecords]);

  // Generate bulk payroll
  const handleGenerateBulkPayroll = async () => {
    if (employeesWithoutPayroll.length === 0) {
      alert("All employees already have payroll for this month");
      return;
    }

    try {
      const payrollData = employeesWithoutPayroll.map((emp) => {
        const bonus = bulkPayroll.includeBonus
          ? (emp.salary * bulkPayroll.bonusPercentage) / 100
          : 0;
        const tax = (emp.salary * bulkPayroll.taxPercentage) / 100;
        const netPay = emp.salary + bonus - tax;

        return {
          employeeId: emp._id,
          month: bulkPayroll.month,
          baseSalary: emp.salary,
          bonus,
          deductions: 0,
          tax,
          netPay,
        };
      });

      await api.post(`/payroll/bulk`, { payrolls: payrollData });

      // Refresh
      const [payRes, sumRes] = await Promise.all([
        api.get<PayrollRecord[]>(`/payroll/monthly`, {
          params: { month: selectedMonth },
        }),
        api.get<PayrollSummary>(`/payroll/summary`, {
          params: { month: selectedMonth },
        }),
      ]);
      setPayrollRecords(payRes.data);
      setSummary(sumRes.data);
      setShowBulkModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to generate payroll");
    }
  };

  // Mark single as paid
  const handleMarkPaid = async (payrollId: string) => {
    try {
      await api.patch(`/payroll/${payrollId}/status`, { status: "paid" });
      setPayrollRecords((prev) =>
        prev.map((p) =>
          p._id === payrollId
            ? { ...p, status: "paid", paidAt: new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  // Mark all pending as paid
  const handleMarkAllPaid = async () => {
    const pendingIds = payrollRecords
      .filter((p) => p.status === "pending")
      .map((p) => p._id);

    if (pendingIds.length === 0) {
      alert("No pending payrolls to mark as paid");
      return;
    }

    if (!confirm(`Mark ${pendingIds.length} payrolls as paid?`)) return;

    try {
      await api.post(`/payroll/bulk-status`, {
        ids: pendingIds,
        status: "paid",
      });

      setPayrollRecords((prev) =>
        prev.map((p) =>
          pendingIds.includes(p._id)
            ? { ...p, status: "paid", paidAt: new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Employee",
      "Month",
      "Base Salary",
      "Bonus",
      "Deductions",
      "Tax",
      "Net Pay",
      "Status",
      "Paid Date",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredRecords.map((p) =>
        [
          `"${p.employeeName}"`,
          p.month,
          p.baseSalary,
          p.bonus,
          p.deductions,
          p.tax,
          p.netPay,
          p.status,
          p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `payroll_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export summary report
  const exportSummaryReport = () => {
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payroll Summary - ${selectedMonth}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #124170; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #124170; margin: 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #124170; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #124170; color: white; }
          .text-right { text-align: right; }
          .status-paid { color: green; }
          .status-pending { color: orange; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PharmacyPOS</h1>
          <p>Payroll Summary Report</p>
          <p>${new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Base Salary</div>
            <div class="value">₵${summary?.totalBaseSalary.toLocaleString() || 0}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Bonuses</div>
            <div class="value">₵${summary?.totalBonus.toLocaleString() || 0}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Deductions</div>
            <div class="value">₵${summary?.totalDeductions.toLocaleString() || 0}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Tax</div>
            <div class="value">₵${summary?.totalTax.toLocaleString() || 0}</div>
          </div>
          <div class="summary-card" style="grid-column: span 2; background: #124170; color: white;">
            <div class="label" style="color: #ccc;">Total Net Payroll</div>
            <div class="value" style="color: white;">₵${summary?.totalNetPay.toLocaleString() || 0}</div>
          </div>
        </div>

        <h3>Employee Payroll Details</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th class="text-right">Base Salary</th>
              <th class="text-right">Bonus</th>
              <th class="text-right">Deductions</th>
              <th class="text-right">Tax</th>
              <th class="text-right">Net Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${payrollRecords
              .map(
                (p) => `
              <tr>
                <td>${p.employeeName}</td>
                <td class="text-right">₵${p.baseSalary.toLocaleString()}</td>
                <td class="text-right">₵${p.bonus.toLocaleString()}</td>
                <td class="text-right">₵${p.deductions.toLocaleString()}</td>
                <td class="text-right">₵${p.tax.toLocaleString()}</td>
                <td class="text-right"><strong>₵${p.netPay.toLocaleString()}</strong></td>
                <td class="status-${p.status}">${p.status.toUpperCase()}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <p style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          Generated on ${new Date().toLocaleString()} | Paid: ${summary?.paidCount || 0} | Pending: ${summary?.pendingCount || 0}
        </p>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex bg-[#F4F7F6] min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate("/employees-database")}
              className="text-sm text-gray-500 hover:text-[#124170] mb-2"
            >
              ← Back to Employees
            </button>
            <h1 className="text-2xl font-semibold text-[#124170]">
              Payroll Management
            </h1>
            <p className="text-sm text-gray-500">
              Manage monthly payroll for all employees
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
            />
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm"
            >
              Generate Payroll
            </button>
            <button
              onClick={handleMarkAllPaid}
              className="px-4 py-2 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
            >
              Pay All
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Salaries</p>
              <p className="text-2xl font-bold text-[#124170]">
                ₵{summary.totalBaseSalary.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Bonuses</p>
              <p className="text-2xl font-bold text-green-600">
                ₵{summary.totalBonus.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Deductions</p>
              <p className="text-2xl font-bold text-red-500">
                ₵{(summary.totalDeductions + summary.totalTax).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 bg-gradient-to-r from-[#124170] to-[#1a5a9e]">
              <p className="text-xs text-white/70 uppercase">Net Payroll</p>
              <p className="text-2xl font-bold text-white">
                ₵{summary.totalNetPay.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Status summary */}
        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
            Paid: {summary?.paidCount || 0}
          </span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
            Pending: {summary?.pendingCount || 0}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
            Not Generated: {employeesWithoutPayroll.length}
          </span>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-[#124170]">Filters</h2>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="text-sm text-[#124170] hover:text-[#67C090]"
              >
                Export CSV
              </button>
              <button
                onClick={exportSummaryReport}
                className="text-sm text-[#124170] hover:text-[#67C090]"
              >
                Print Report
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                placeholder="Employee name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No payroll records for{" "}
              {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#124170] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-right">Base Salary</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">
                      Bonus
                    </th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">
                      Deductions
                    </th>
                    <th className="px-4 py-3 text-right">Net Pay</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#124170]">
                          {record.employeeName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        ₵{record.baseSalary.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 hidden sm:table-cell">
                        +₵{record.bonus.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-red-500 hidden md:table-cell">
                        -₵{(record.deductions + record.tax).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        ₵{record.netPay.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              navigate(
                                `/employees/${record.employeeId}/payroll`
                              )
                            }
                            className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                          >
                            Details
                          </button>
                          {record.status === "pending" && (
                            <button
                              onClick={() => handleMarkPaid(record._id)}
                              className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bulk Generate Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold text-[#124170] mb-4">
                Generate Monthly Payroll
              </h2>

              <p className="text-sm text-gray-500 mb-4">
                This will generate payroll for {employeesWithoutPayroll.length}{" "}
                employees who don't have payroll for the selected month.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Month</label>
                  <input
                    type="month"
                    value={bulkPayroll.month}
                    onChange={(e) =>
                      setBulkPayroll({ ...bulkPayroll, month: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeBonus"
                    checked={bulkPayroll.includeBonus}
                    onChange={(e) =>
                      setBulkPayroll({
                        ...bulkPayroll,
                        includeBonus: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <label htmlFor="includeBonus" className="text-sm text-gray-600">
                    Include bonus
                  </label>
                </div>

                {bulkPayroll.includeBonus && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Bonus (% of salary)
                    </label>
                    <input
                      type="number"
                      value={bulkPayroll.bonusPercentage}
                      onChange={(e) =>
                        setBulkPayroll({
                          ...bulkPayroll,
                          bonusPercentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Tax (% of salary)
                  </label>
                  <input
                    type="number"
                    value={bulkPayroll.taxPercentage}
                    onChange={(e) =>
                      setBulkPayroll({
                        ...bulkPayroll,
                        taxPercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateBulkPayroll}
                  disabled={employeesWithoutPayroll.length === 0}
                  className="flex-1 px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
