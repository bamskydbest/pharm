import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/services/api";
import Sidebar from "./Sidebar";

type Employee = {
  _id: string;
  name: string;
  role: string;
  department: string;
};

type TodayAttendance = {
  employeeId: string;
  employeeName: string;
  status: "present" | "absent" | "late" | "leave" | "not_marked";
  clockIn: string | null;
  clockOut: string | null;
};

type AttendanceSummary = {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  notMarked: number;
};

export default function AttendanceOverview() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    notMarked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Filters
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  // Quick mark modal
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markEmployee, setMarkEmployee] = useState<Employee | null>(null);
  const [markData, setMarkData] = useState({
    status: "present" as TodayAttendance["status"],
    clockIn: "09:00",
    clockOut: "",
    notes: "",
  });

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({
    defaultShiftStart: "09:00",
    defaultShiftEnd: "17:00",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    api.get("/attendance/settings")
      .then((res) => {
        setSettingsData({
          defaultShiftStart: res.data.defaultShiftStart || "09:00",
          defaultShiftEnd: res.data.defaultShiftEnd || "17:00",
        });
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSettingsLoading(true);
      await api.put("/attendance/settings", settingsData);
      setShowSettings(false);
      alert("Attendance settings updated successfully");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  // Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Employee[]>("/employees"),
      api.get<TodayAttendance[]>(`/attendance/daily`, {
        params: { date: selectedDate },
      }),
      api.get<AttendanceSummary>(`/attendance/summary`, {
        params: { date: selectedDate },
      }),
    ])
      .then(([empRes, attRes, sumRes]) => {
        setEmployees(empRes.data);
        setTodayAttendance(attRes.data);
        setSummary(sumRes.data);
      })
      .catch((err) => {
        console.error("Failed to load attendance data:", err);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Get unique departments
  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))],
    [employees]
  );

  // Merge employees with today's attendance
  const employeeAttendance = useMemo(() => {
    return employees.map((emp) => {
      const att = todayAttendance.find((a) => a.employeeId === emp._id);
      return {
        ...emp,
        status: att?.status || "not_marked",
        clockIn: att?.clockIn || null,
        clockOut: att?.clockOut || null,
      };
    });
  }, [employees, todayAttendance]);

  // Filter
  const filteredEmployees = useMemo(() => {
    let result = employeeAttendance;

    if (searchName) {
      result = result.filter((e) =>
        e.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (filterStatus) {
      result = result.filter((e) => e.status === filterStatus);
    }

    if (filterDepartment) {
      result = result.filter((e) => e.department === filterDepartment);
    }

    return result;
  }, [employeeAttendance, searchName, filterStatus, filterDepartment]);

  // Quick mark attendance
  const handleQuickMark = async () => {
    if (!markEmployee) return;

    try {
      await api.post(`/attendance`, {
        employeeId: markEmployee._id,
        date: selectedDate,
        ...markData,
      });

      // Refresh attendance
      const [attRes, sumRes] = await Promise.all([
        api.get<TodayAttendance[]>(`/attendance/daily`, {
          params: { date: selectedDate },
        }),
        api.get<AttendanceSummary>(`/attendance/summary`, {
          params: { date: selectedDate },
        }),
      ]);
      setTodayAttendance(attRes.data);
      setSummary(sumRes.data);
      setShowMarkModal(false);
      setMarkEmployee(null);
      setMarkData({
        status: "present",
        clockIn: "09:00",
        clockOut: "",
        notes: "",
      });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to mark attendance");
    }
  };

  // Bulk mark all as present
  const handleBulkMarkPresent = async () => {
    const notMarkedEmployees = employeeAttendance.filter(
      (e) => e.status === "not_marked"
    );

    if (notMarkedEmployees.length === 0) {
      alert("All employees already marked");
      return;
    }

    if (
      !confirm(
        `Mark ${notMarkedEmployees.length} employees as present for ${selectedDate}?`
      )
    ) {
      return;
    }

    try {
      await api.post(`/attendance/bulk`, {
        date: selectedDate,
        employees: notMarkedEmployees.map((e) => ({
          employeeId: e._id,
          status: "present",
          clockIn: "09:00",
        })),
      });

      // Refresh
      const [attRes, sumRes] = await Promise.all([
        api.get<TodayAttendance[]>(`/attendance/daily`, {
          params: { date: selectedDate },
        }),
        api.get<AttendanceSummary>(`/attendance/summary`, {
          params: { date: selectedDate },
        }),
      ]);
      setTodayAttendance(attRes.data);
      setSummary(sumRes.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to mark attendance");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "late":
        return "bg-yellow-100 text-yellow-700";
      case "leave":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-500";
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
              Attendance Overview
            </h1>
            <p className="text-sm text-gray-500">
              View and manage daily attendance for all employees
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
            />
            <button
              onClick={handleBulkMarkPresent}
              className="px-4 py-2 bg-[#67C090] text-white rounded-lg hover:bg-[#52a377] transition text-sm"
            >
              Mark All Present
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              title="Attendance Settings"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-[#124170]">{employees.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Present</p>
            <p className="text-2xl font-bold text-green-600">
              {summary.presentToday}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Absent</p>
            <p className="text-2xl font-bold text-red-500">{summary.absentToday}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Late</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.lateToday}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 uppercase">Not Marked</p>
            <p className="text-2xl font-bold text-gray-500">{summary.notMarked}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-medium text-[#124170] mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="leave">Leave</option>
                <option value="not_marked">Not Marked</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Department</label>
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
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No employees found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#124170] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">
                      Department
                    </th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Clock In</th>
                    <th className="px-4 py-3 text-center">Clock Out</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#124170]">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.role}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {emp.department || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                            emp.status
                          )}`}
                        >
                          {emp.status === "not_marked" ? "Not Marked" : emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {emp.clockIn
                          ? new Date(emp.clockIn).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {emp.clockOut
                          ? new Date(emp.clockOut).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setMarkEmployee(emp);
                              setShowMarkModal(true);
                            }}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Mark
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/employees/${emp._id}/attendance`)
                            }
                            className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                          >
                            History
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

        {/* Quick Mark Modal */}
        {showMarkModal && markEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold text-[#124170] mb-4">
                Mark Attendance - {markEmployee.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select
                    value={markData.status}
                    onChange={(e) =>
                      setMarkData({
                        ...markData,
                        status: e.target.value as TodayAttendance["status"],
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>

                {(markData.status === "present" || markData.status === "late") && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Clock In
                      </label>
                      <input
                        type="time"
                        value={markData.clockIn}
                        onChange={(e) =>
                          setMarkData({ ...markData, clockIn: e.target.value })
                        }
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Clock Out (optional)
                      </label>
                      <input
                        type="time"
                        value={markData.clockOut}
                        onChange={(e) =>
                          setMarkData({ ...markData, clockOut: e.target.value })
                        }
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={markData.notes}
                    onChange={(e) =>
                      setMarkData({ ...markData, notes: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowMarkModal(false);
                    setMarkEmployee(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickMark}
                  className="flex-1 px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#124170]">
                  Attendance Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  &times;
                </button>
              </div>

              <p className="text-sm text-gray-500">
                Set the default shift times. These apply to employees without a custom shift assigned.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Shift Start
                  </label>
                  <input
                    type="time"
                    value={settingsData.defaultShiftStart}
                    onChange={(e) =>
                      setSettingsData({ ...settingsData, defaultShiftStart: e.target.value })
                    }
                    className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Shift End
                  </label>
                  <input
                    type="time"
                    value={settingsData.defaultShiftEnd}
                    onChange={(e) =>
                      setSettingsData({ ...settingsData, defaultShiftEnd: e.target.value })
                    }
                    className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700">
                  Employees arriving after the shift start time will be automatically marked as <strong>Late</strong>.
                  You can override this per employee by setting a custom shift in their profile.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsLoading}
                  className="flex-1 px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] disabled:opacity-50"
                >
                  {settingsLoading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
