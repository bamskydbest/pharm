import { NavLink } from "react-router-dom";
import { useAuthStore } from "../components/store/authStore";

export default function Sidebar() {
  const { user } = useAuthStore();
  if (!user) return null;

  const links = [
    { to: "/", label: "Dashboard", roles: ["ADMIN"] },
    { to: "/pos", label: "POS", roles: ["CASHIER", "ADMIN"] },
    { to: "/inventory", label: "Inventory", roles: ["PHARMACIST", "ADMIN"] },
    { to: "/customers", label: "Customers", roles: ["ADMIN"] },
    { to: "/employees-database", label: "Employees", roles: ["ADMIN"] },
    { to: "/accounting", label: "Accounting", roles: ["ACCOUNTANT", "ADMIN"] },
    { to: "/reports", label: "Reports", roles: ["ADMIN"] },
  ];

  return (
    <aside className="hidden lg:flex w-64 min-h-screen bg-[#F7FBF9] shadow-[4px_0_12px_rgba(0,0,0,0.06)] px-5 py-6">
      <div className="w-full">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Dashboard
        </h2>

        <nav className="space-y-1">
          {links
            .filter((l) => l.roles.includes(user.role))
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `
                  flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition
                  ${
                    isActive
                      ? "bg-[#67C090] text-white shadow-sm"
                      : "text-[#124170] hover:bg-[#DDF4E7]"
                  }
                `
                }
              >
                {l.label}
              </NavLink>
            ))}
        </nav>
      </div>
    </aside>
  );
}
