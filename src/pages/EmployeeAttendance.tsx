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
};

type AttendanceRecord = {
  _id: string;
  employeeId: string;
  date: string;
  status: "present" | "absent" | "late" | "leave";
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  notes: string;
};

type AttendanceStats = {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  avgHoursWorked: number;
};

export default function EmployeeAttendance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("");

  // Clock in/out form
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockAction, setClockAction] = useState<"in" | "out">("in");
  const [clockTime, setClockTime] = useState("");
  const [clockDate, setClockDate] = useState(new Date().toISOString().split("T")[0]);

  // Add attendance form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAttendance, setNewAttendance] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "present" as AttendanceRecord["status"],
    clockIn: "09:00",
    clockOut: "17:00",
    notes: "",
  });

  // Fetch data
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      api.get<Employee>(`/employees/${id}`),
      api.get<AttendanceRecord[]>(`/attendance/employee/${id}`, {
        params: { from: dateFrom, to: dateTo },
      }),
      api.get<AttendanceStats>(`/attendance/employee/${id}/stats`, {
        params: { from: dateFrom, to: dateTo },
      }),
    ])
      .then(([empRes, attRes, statsRes]) => {
        setEmployee(empRes.data);
        setAttendance(attRes.data);
        setStats(statsRes.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, [id, dateFrom, dateTo]);

  // Filtered attendance
  const filteredAttendance = filterStatus
    ? attendance.filter((a) => a.status === filterStatus)
    : attendance;

  // Clock in/out handler
  const handleClock = async () => {
    if (!id) return;

    try {
      await api.post(`/attendance/clock`, {
        employeeId: id,
        action: clockAction,
        time: clockTime || new Date().toISOString(),
        date: clockDate,
      });

      // Refresh data
      const res = await api.get<AttendanceRecord[]>(`/attendance/employee/${id}`, {
        params: { from: dateFrom, to: dateTo },
      });
      setAttendance(res.data);
      setShowClockModal(false);
      setClockTime("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to record clock time");
    }
  };

  // Add attendance record
  const handleAddAttendance = async () => {
    if (!id) return;

    try {
      await api.post(`/attendance`, {
        employeeId: id,
        ...newAttendance,
      });

      // Refresh data
      const [attRes, statsRes] = await Promise.all([
        api.get<AttendanceRecord[]>(`/attendance/employee/${id}`, {
          params: { from: dateFrom, to: dateTo },
        }),
        api.get<AttendanceStats>(`/attendance/employee/${id}/stats`, {
          params: { from: dateFrom, to: dateTo },
        }),
      ]);
      setAttendance(attRes.data);
      setStats(statsRes.data);
      setShowAddModal(false);
      setNewAttendance({
        date: new Date().toISOString().split("T")[0],
        status: "present",
        clockIn: "09:00",
        clockOut: "17:00",
        notes: "",
      });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add attendance");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Status", "Clock In", "Clock Out", "Hours Worked", "Notes"];
    const csvContent = [
      headers.join(","),
      ...filteredAttendance.map((a) =>
        [
          new Date(a.date).toLocaleDateString(),
          a.status,
          a.clockIn ? new Date(a.clockIn).toLocaleTimeString() : "",
          a.clockOut ? new Date(a.clockOut).toLocaleTimeString() : "",
          a.hoursWorked?.toFixed(2) || "",
          `"${a.notes || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${employee?.name || id}_${dateFrom}_${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
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
        return "bg-gray-100 text-gray-700";
    }
  };

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
              {employee?.name || "Employee"} - Attendance
            </h1>
            <p className="text-sm text-gray-500">
              {employee?.role} • {employee?.department || "No Department"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setClockAction("in");
                setShowClockModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              Clock In
            </button>
            <button
              onClick={() => {
                setClockAction("out");
                setShowClockModal(true);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
            >
              Clock Out
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52] transition text-sm"
            >
              Add Record
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Total Days</p>
              <p className="text-2xl font-bold text-[#124170]">{stats.totalDays}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Absent</p>
              <p className="text-2xl font-bold text-red-500">{stats.absent}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Late</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase">Avg Hours</p>
              <p className="text-2xl font-bold text-[#124170]">
                {stats.avgHoursWorked?.toFixed(1) || 0}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-medium text-[#124170] mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
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

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredAttendance.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No attendance records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#124170] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Clock In</th>
                    <th className="px-4 py-3 text-center">Clock Out</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAttendance.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {new Date(record.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
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
                      <td className="px-4 py-3 text-center text-gray-600">
                        {record.clockIn
                          ? new Date(record.clockIn).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {record.clockOut
                          ? new Date(record.clockOut).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {record.hoursWorked?.toFixed(2) || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {record.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Clock In/Out Modal */}
        {showClockModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold text-[#124170] mb-4">
                Clock {clockAction === "in" ? "In" : "Out"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={clockDate}
                    onChange={(e) => setClockDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Time (leave empty for current time)
                  </label>
                  <input
                    type="time"
                    value={clockTime}
                    onChange={(e) => setClockTime(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowClockModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClock}
                  className={`flex-1 px-4 py-2 text-white rounded-lg ${
                    clockAction === "in"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  Clock {clockAction === "in" ? "In" : "Out"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Attendance Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold text-[#124170] mb-4">
                Add Attendance Record
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={newAttendance.date}
                    onChange={(e) =>
                      setNewAttendance({ ...newAttendance, date: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select
                    value={newAttendance.status}
                    onChange={(e) =>
                      setNewAttendance({
                        ...newAttendance,
                        status: e.target.value as AttendanceRecord["status"],
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

                {(newAttendance.status === "present" ||
                  newAttendance.status === "late") && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Clock In
                      </label>
                      <input
                        type="time"
                        value={newAttendance.clockIn}
                        onChange={(e) =>
                          setNewAttendance({
                            ...newAttendance,
                            clockIn: e.target.value,
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Clock Out
                      </label>
                      <input
                        type="time"
                        value={newAttendance.clockOut}
                        onChange={(e) =>
                          setNewAttendance({
                            ...newAttendance,
                            clockOut: e.target.value,
                          })
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
                    value={newAttendance.notes}
                    onChange={(e) =>
                      setNewAttendance({ ...newAttendance, notes: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#67C090]"
                    rows={2}
                  />
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
                  onClick={handleAddAttendance}
                  className="flex-1 px-4 py-2 bg-[#124170] text-white rounded-lg hover:bg-[#0d2f52]"
                >
                  Add Record
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
