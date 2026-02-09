import { useEffect, useState } from "react";
import api from "../components/services/api";

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

export default function Employees() {
  const [staff, setStaff] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<Employee[]>("/employees").then((res) => {
      setStaff(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const filtered = search
    ? staff.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.role.toLowerCase().includes(search.toLowerCase()) ||
          s.department?.toLowerCase().includes(search.toLowerCase()) ||
          s.email?.toLowerCase().includes(search.toLowerCase())
      )
    : staff;

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

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      <main className="px-3 sm:px-4 lg:px-6 py-4 lg:py-6 max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#124170]">Employees</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage and view employee information
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <input
            type="text"
            placeholder="Search by name, role, department, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
          />
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Mobile Card View */}
          <div className="lg:hidden divide-y">
            {filtered.map((emp) => (
              <div
                key={emp._id}
                onClick={() => setSelectedEmployee(emp)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#124170] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#124170] truncate">{emp.name}</p>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                        emp.status === "inactive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}>
                        {emp.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{emp.role} {emp.department ? `- ${emp.department}` : ""}</p>
                    {emp.email && <p className="text-xs text-gray-400 truncate">{emp.email}</p>}
                  </div>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((emp) => (
                  <tr key={emp._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[#124170] text-white flex items-center justify-center text-sm font-bold">
                          {emp.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-[#124170]">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.role}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.department || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.email || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.phone || "N/A"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === "inactive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}>
                        {emp.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                        className="px-3 py-1.5 text-xs text-[#124170] border border-[#124170] rounded-lg hover:bg-[#124170] hover:text-white transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No employees found</p>
              {search && <p className="text-xs text-gray-400 mt-1">Try a different search term</p>}
            </div>
          )}
        </div>

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
                      <p className="font-medium text-[#124170]">{selectedEmployee.email || "Not provided"}</p>
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

              <div className="px-4 sm:px-6 py-4 bg-gray-50 flex-shrink-0">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="w-full px-4 py-2.5 border rounded-lg hover:bg-gray-100 text-sm"
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
