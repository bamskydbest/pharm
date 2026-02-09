import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../components/store/authStore";
import api from "../components/services/api";

type ClockStatus = {
  status: "not_marked" | "present" | "late" | "absent" | "leave";
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
};

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Clock state
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [clockLoading, setClockLoading] = useState(false);

  // Fetch clock status on mount
  useEffect(() => {
    if (!user) return;
    api
      .get<ClockStatus>("/attendance/my-status")
      .then((res) => setClockStatus(res.data))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const links = [
    { to: "/", label: "Dashboard", roles: ["ADMIN"] },
    { to: "/pos", label: "POS", roles: ["CASHIER", "ADMIN"] },
    { to: "/inventory", label: "Inventory", roles: ["PHARMACIST", "ADMIN"] },
    { to: "/customers", label: "Customers", roles: ["ADMIN"] },
    { to: "/employees-database", label: "Employees", roles: ["ADMIN"] },
    { to: "/accounting", label: "Accounting", roles: ["ACCOUNTANT", "ADMIN"] },
    { to: "/reports", label: "Reports", roles: ["ADMIN"] },
    { to: "/admin/create-user", label: "Add Staff", roles: ["ADMIN"] },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSelfClock = async (action: "in" | "out") => {
    try {
      setClockLoading(true);
      await api.post("/attendance/self-clock", { action });
      // Refresh status
      const res = await api.get<ClockStatus>("/attendance/my-status");
      setClockStatus(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "Clock action failed");
    } finally {
      setClockLoading(false);
    }
  };

  // Determine what button to show
  const isClockedIn = clockStatus?.clockIn && !clockStatus?.clockOut;
  const isClockedOut = clockStatus?.clockIn && clockStatus?.clockOut;
  const notClockedIn = !clockStatus?.clockIn;

  const ClockButton = ({ mobile }: { mobile?: boolean }) => {
    const baseClass = mobile
      ? "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition"
      : "px-3 py-1.5 rounded-lg text-xs font-medium transition";

    if (isClockedOut) {
      return (
        <div className={`${baseClass} bg-gray-100 text-gray-500 flex items-center gap-1.5`}>
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          Done — {clockStatus!.hoursWorked}h
        </div>
      );
    }

    if (isClockedIn) {
      return (
        <button
          onClick={() => handleSelfClock("out")}
          disabled={clockLoading}
          className={`${baseClass} bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 disabled:opacity-50`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
          {clockLoading ? "..." : "Clock Out"}
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSelfClock("in")}
        disabled={clockLoading}
        className={`${baseClass} bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 flex items-center gap-1.5 disabled:opacity-50`}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        {clockLoading ? "..." : "Clock In"}
      </button>
    );
  };

  return (
    <header className="bg-[#DDF4E7]  shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="font-bold text-lg text-[#124170] cursor-pointer"
            onClick={() => navigate("/")}
          >
            PharmacyPOS
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links
              .filter((l) => l.roles.includes(user.role))
              .map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    isActive
                      ? "text-[#124170] font-semibold"
                      : "text-[#124170] hover:text-[#67C090] transition-colors"
                  }
                >
                  {l.label}
                </NavLink>
              ))}

            {/* Clock In/Out Button */}
            <ClockButton />

            <button
              onClick={handleLogout}
              className="text-sm text-[#124170] hover:text-[#67C090] transition-colors"
            >
              Logout
            </button>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-xl text-[#124170]"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-[#DDF4E7] px-4 py-3 space-y-3">
          {links
            .filter((l) => l.roles.includes(user.role))
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block text-[#124170] hover:text-[#67C090] transition-colors"
              >
                {l.label}
              </NavLink>
            ))}

          {/* Clock In/Out Button (Mobile) */}
          <ClockButton mobile />

          <button
            onClick={handleLogout}
            className="block text-[#124170] hover:text-[#67C090] transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
