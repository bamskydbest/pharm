import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../components/services/api";
import Sidebar from "./Sidebar";

type Employee = {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
  bankName: string;
  bankAccount: string;
};

type PayrollRecord = {
  _id: string;
  employeeId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonus: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: "pending" | "paid" | "cancelled";
  paidAt: string | null;
  notes: string;
  createdAt: string;
};

type PayrollSummary = {
  totalEarnings: number;
  totalDeductions: number;
  totalTax: number;
  totalNetPay: number;
  recordCount: number;
};

export default function EmployeePayroll() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterStatus, setFilterStatus] = useState("");

  // Add payroll modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayroll, setNewPayroll] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    baseSalary: 0,
    bonus: 0,
    deductions: 0,
    tax: 0,
    notes: "",
  });

  // Fetch data
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      api.get<Employee>(`/employees/${id}`),
      api.get<PayrollRecord[]>(`/payroll/employee/${id}`, {
        params: { year: filterYear },
      }),
      api.get<PayrollSummary>(`/payroll/employee/${id}/summary`, {
        params: { year: filterYear },
      }),
    ])
      .then(([empRes, payRes, sumRes]) => {
        setEmployee(empRes.data);
        setPayroll(payRes.data);
        setSummary(sumRes.data);
        setNewPayroll((prev) => ({
          ...prev,
          baseSalary: empRes.data.salary || 0,
        }));
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [id, filterYear]);

  // Filtered payroll
  const filteredPayroll = filterStatus
    ? payroll.filter((p) => p.status === filterStatus)
    : payroll;

  // Calculate net pay
  const calculateNetPay = () => {
    return (
      newPayroll.baseSalary +
      newPayroll.bonus -
      newPayroll.deductions -
      newPayroll.tax
    );
  };

  // Add payroll handler
  const handleAddPayroll = async () => {
    if (!id) return;

    try {
      await api.post(`/payroll`, {
        employeeId: id,
        ...newPayroll,
        netPay: calculateNetPay(),
      });

      // Refresh data
      const [payRes, sumRes] = await Promise.all([
        api.get<PayrollRecord[]>(`/payroll/employee/${id}`, {
          params: { year: filterYear },
        }),
        api.get<PayrollSummary>(`/payroll/employee/${id}/summary`, {
          params: { year: filterYear },
        }),
      ]);
      setPayroll(payRes.data);
      setSummary(sumRes.data);
      setShowAddModal(false);
      setNewPayroll({
        month: new Date().toISOString().slice(0, 7),
        baseSalary: employee?.salary || 0,
        bonus: 0,
        deductions: 0,
        tax: 0,
        notes: "",
      });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add payroll");
    }
  };

  // Mark as paid
  const handleMarkPaid = async (payrollId: string) => {
    try {
      await api.patch(`/payroll/${payrollId}/status`, { status: "paid" });
      setPayroll((prev) =>
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

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Month",
      "Base Salary",
      "Bonus",
      "Deductions",
      "Tax",
      "Net Pay",
      "Status",
      "Paid Date",
      "Notes",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredPayroll.map((p) =>
        [
          p.month,
          p.baseSalary,
          p.bonus,
          p.deductions,
          p.tax,
          p.netPay,
          p.status,
          p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "",
          `"${p.notes || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `payroll_${employee?.name || id}_${filterYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Generate payslip
  const generatePayslip = (record: PayrollRecord) => {
    const payslipContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${employee?.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #124170; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #124170; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .info-item { padding: 5px 0; }
          .info-label { font-size: 12px; color: #666; }
          .info-value { font-weight: bold; }
          .earnings-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .earnings-table th, .earnings-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .earnings-table th { background: #f5f5f5; }
          .earnings-table .amount { text-align: right; }
          .total-row { font-weight: bold; background: #124170 !important; color: white; }
          .total-row td { border: none; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PharmacyPOS</h1>
          <p>Payslip for ${new Date(record.month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Employee Name</div>
            <div class="info-value">${employee?.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Employee ID</div>
            <div class="info-value">${employee?._id.slice(-8).toUpperCase()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Department</div>
            <div class="info-value">${employee?.department || "N/A"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Role</div>
            <div class="info-value">${employee?.role}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Bank Name</div>
            <div class="info-value">${employee?.bankName || "N/A"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Account Number</div>
            <div class="info-value">${employee?.bankAccount || "N/A"}</div>
          </div>
        </div>

        <table class="earnings-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount">Amount (₵)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Salary</td>
              <td class="amount">${record.baseSalary.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Bonus</td>
              <td class="amount">+${record.bonus.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Deductions</td>
              <td class="amount">-${record.deductions.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td class="amount">-${record.tax.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td>Net Pay</td>
              <td class="amount">₵${record.netPay.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        ${record.notes ? `<p><strong>Notes:</strong> ${record.notes}</p>` : ""}

        <p><strong>Payment Status:</strong> ${record.status.toUpperCase()} ${record.paidAt ? `on ${new Date(record.paidAt).toLocaleDateString()}` : ""}</p>

        <div class="footer">
          <p>This is a computer-generated payslip. No signature required.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (printWindow) {
      printWindow.document.write(payslipContent);
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

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );

  if (loading) {
    return (
      <div className="flex bg-[#F4F7F6] min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="text-center text-gray-500">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-[#F4F7F6] min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate("/employees-database")}
              className="text-sm text-gray-500 hover:text-[#124170] mb-2 flex items-center gap-1"
            >
              ← Back to Employees
            </button>
            <h1 className="text-2xl font-semibold text-[#124170]">
              {employee?.name || "Employee"} - Payroll
            </h1>
            <p className="text-sm text-gray-500">
              {employee?.role} • Base Salary: ₵{employee?.salary?.toLocaleString() || 0}/month
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
          >
            Add Payroll
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Earnings</p>
              <p className="text-2xl font-bold text-[#124170]">
                ₵{summary.totalEarnings.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Deductions</p>
              <p className="text-2xl font-bold text-red-500">
                ₵{summary.totalDeductions.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Tax</p>
              <p className="text-2xl font-bold text-yellow-600">
                ₵{summary.totalTax.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Net Pay ({filterYear})</p>
              <p className="text-2xl font-bold text-green-600">
                ₵{summary.totalNetPay.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Records</p>
              <p className="text-2xl font-bold text-[#124170]">{summary.recordCount}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-medium text-[#124170] mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
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
            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 border border-[#124170] text-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition text-sm"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredPayroll.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No payroll records found for {filterYear}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#124170] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right">Base Salary</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Bonus</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Deductions</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Tax</th>
                    <th className="px-4 py-3 text-right">Net Pay</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayroll.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {new Date(record.month + "-01").toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ₵{record.baseSalary.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 hidden sm:table-cell">
                        +₵{record.bonus.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-red-500 hidden sm:table-cell">
                        -₵{record.deductions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-600 hidden md:table-cell">
                        -₵{record.tax.toLocaleString()}
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
                            onClick={() => generatePayslip(record)}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Payslip
                          </button>
                          {record.status === "pending" && (
                            <button
                              onClick={() => handleMarkPaid(record._id)}
                              className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                            >
                              Mark Paid
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

        {/* Add Payroll Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-[#124170] mb-4">
                Add Payroll for {employee?.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Month</label>
                  <input
                    type="month"
                    value={newPayroll.month}
                    onChange={(e) =>
                      setNewPayroll({ ...newPayroll, month: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Base Salary (₵)
                  </label>
                  <input
                    type="number"
                    value={newPayroll.baseSalary}
                    onChange={(e) =>
                      setNewPayroll({
                        ...newPayroll,
                        baseSalary: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Bonus (₵)
                  </label>
                  <input
                    type="number"
                    value={newPayroll.bonus}
                    onChange={(e) =>
                      setNewPayroll({
                        ...newPayroll,
                        bonus: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Deductions (₵)
                  </label>
                  <input
                    type="number"
                    value={newPayroll.deductions}
                    onChange={(e) =>
                      setNewPayroll({
                        ...newPayroll,
                        deductions: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tax (₵)</label>
                  <input
                    type="number"
                    value={newPayroll.tax}
                    onChange={(e) =>
                      setNewPayroll({
                        ...newPayroll,
                        tax: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={newPayroll.notes}
                    onChange={(e) =>
                      setNewPayroll({ ...newPayroll, notes: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    rows={2}
                  />
                </div>

                {/* Net Pay Preview */}
                <div className="bg-[#DDF4E7] rounded-lg p-4">
                  <p className="text-sm text-gray-600">Net Pay</p>
                  <p className="text-2xl font-bold text-[#124170]">
                    ₵{calculateNetPay().toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayroll}
                  className="flex-1 px-4 py-2 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377]"
                >
                  Add Payroll
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
