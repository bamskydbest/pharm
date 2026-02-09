import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/services/api";
import { useAuthStore } from "../components/store/authStore";
import Sidebar from "./Sidebar";

type Employee = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  salary: number;
  hireDate: string;
  profilePicture?: string;
  shiftStart?: string;
  shiftEnd?: string;
  status: "active" | "inactive";
  createdAt: string;
};

type AttendanceSummary = {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
};

type SortField = "name" | "role" | "department" | "salary" | "hireDate";
type SortOrder = "asc" | "desc";

export default function EmployeesDatabase() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "User";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [searchName, setSearchName] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Fetch employees
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Employee[]>("/employees"),
      api.get<AttendanceSummary>("/attendance/summary/today"),
    ])
      .then(([empRes, attRes]) => {
        setEmployees(empRes.data);
        setAttendanceSummary(attRes.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load employees");
        // Still try to load employees if attendance fails
        api.get<Employee[]>("/employees").then((res) => setEmployees(res.data));
      })
      .finally(() => setLoading(false));
  }, []);

  // Get unique roles and departments for filters
  const roles = useMemo(
    () => [...new Set(employees.map((e) => e.role))],
    [employees]
  );
  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))],
    [employees]
  );

  // Filter and sort
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (searchName) {
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(searchName.toLowerCase()) ||
          e.email.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (filterRole) {
      result = result.filter((e) => e.role === filterRole);
    }

    if (filterDepartment) {
      result = result.filter((e) => e.department === filterDepartment);
    }

    if (filterStatus) {
      result = result.filter((e) => e.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "role":
          comparison = a.role.localeCompare(b.role);
          break;
        case "department":
          comparison = (a.department || "").localeCompare(b.department || "");
          break;
        case "salary":
          comparison = a.salary - b.salary;
          break;
        case "hireDate":
          comparison =
            new Date(a.hireDate).getTime() - new Date(b.hireDate).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [employees, searchName, filterRole, filterDepartment, filterStatus, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, filterRole, filterDepartment, filterStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchName("");
    setFilterRole("");
    setFilterDepartment("");
    setFilterStatus("");
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  const getYearsOfService = (hireDate: string) => {
    const startDate = new Date(hireDate);
    const today = new Date();
    const years = today.getFullYear() - startDate.getFullYear();
    const months = today.getMonth() - startDate.getMonth();
    if (years < 1) {
      const totalMonths = years * 12 + months;
      return `${totalMonths} month${totalMonths !== 1 ? "s" : ""}`;
    }
    return `${years} year${years !== 1 ? "s" : ""}${months > 0 ? `, ${months} month${months !== 1 ? "s" : ""}` : ""}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Role", "Department", "Salary", "Hire Date", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredEmployees.map((e) =>
        [
          `"${e.name}"`,
          `"${e.email}"`,
          `"${e.phone || ""}"`,
          `"${e.role}"`,
          `"${e.department || ""}"`,
          e.salary,
          new Date(e.hireDate).toLocaleDateString(),
          e.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `employees_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
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
              onClick={() => navigate("/employees/attendance")}
              className="px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm"
            >
              Attendance Overview
            </button>
            <button
              onClick={() => navigate("/employees/payroll")}
              className="px-4 py-2 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
            >
              Payroll Management
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Total Employees</p>
            <p className="text-2xl font-bold text-[#124170]">{employees.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Present Today</p>
            <p className="text-2xl font-bold text-green-600">
              {attendanceSummary.presentToday}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Absent Today</p>
            <p className="text-2xl font-bold text-red-500">
              {attendanceSummary.absentToday}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">On Leave</p>
            <p className="text-2xl font-bold text-yellow-600">
              {attendanceSummary.onLeaveToday}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-[#124170]">Filters</h2>
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-[#124170] transition"
              >
                Clear all
              </button>
              <button
                onClick={exportToCSV}
                className="text-sm text-[#124170] hover:text-[#67C090] transition"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Name or email..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Department
              </label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Per Page
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="text-sm text-gray-500">
          Showing {startIndex + 1}-
          {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{" "}
          {filteredEmployees.length} employees
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading employees...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#124170] text-white">
                  <tr>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-[#0d2f52]"
                      onClick={() => handleSort("name")}
                    >
                      Employee <SortIndicator field="name" />
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-[#0d2f52]"
                      onClick={() => handleSort("role")}
                    >
                      Role <SortIndicator field="role" />
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:bg-[#0d2f52] hidden md:table-cell"
                      onClick={() => handleSort("department")}
                    >
                      Department <SortIndicator field="department" />
                    </th>
                    <th
                      className="px-4 py-3 text-right cursor-pointer hover:bg-[#0d2f52]"
                      onClick={() => handleSort("salary")}
                    >
                      Salary <SortIndicator field="salary" />
                    </th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#124170]">
                            {emp.name}
                          </p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{emp.role}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {emp.department || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₵{emp.salary?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            emp.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {emp.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="px-2 py-1 text-xs bg-[#124170] text-white rounded hover:bg-[#0d2f52] transition"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/employees/${emp._id}/attendance`)
                            }
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                          >
                            Attendance
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/employees/${emp._id}/payroll`)
                            }
                            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition"
                          >
                            Payroll
                          </button>
                        </div>
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
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
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
                    className={`w-10 h-10 rounded-lg text-sm ${
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
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
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
                {/* Personal Information + Profile Picture */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Personal Information
                    </h3>
                    {/* Profile Picture */}
                    <div className="flex-shrink-0 ml-4">
                      {selectedEmployee.profilePicture ? (
                        <img
                          src={selectedEmployee.profilePicture}
                          alt={selectedEmployee.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-[#124170]/20 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#124170] flex items-center justify-center border-4 border-[#124170]/20 shadow-md">
                          <span className="text-2xl sm:text-3xl font-bold text-white">
                            {selectedEmployee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
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
                      <p className="text-xs text-gray-500">Hire Date</p>
                      <p className="font-medium text-[#124170]">
                        {selectedEmployee.hireDate
                          ? new Date(selectedEmployee.hireDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Years of Service</p>
                      <p className="font-medium text-[#124170]">
                        {selectedEmployee.hireDate
                          ? getYearsOfService(selectedEmployee.hireDate)
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
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 sm:col-span-2">
                      <p className="text-xs text-purple-600">Shift Schedule</p>
                      <p className="text-lg font-bold text-purple-700">
                        {selectedEmployee.shiftStart || "09:00"} — {selectedEmployee.shiftEnd || "17:00"}
                      </p>
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

              <div className="px-4 sm:px-6 py-4 bg-gray-50 flex gap-2">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="flex-1 px-4 py-2.5 border rounded-lg hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => { navigate(`/employees/${selectedEmployee._id}/attendance`); setSelectedEmployee(null); }}
                  className="flex-1 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
                >
                  Attendance
                </button>
                <button
                  onClick={() => { navigate(`/employees/${selectedEmployee._id}/payroll`); setSelectedEmployee(null); }}
                  className="flex-1 px-4 py-2.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm"
                >
                  Payroll
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
