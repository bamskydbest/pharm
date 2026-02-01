import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../components/store/authStore";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const links = [
    { to: "/", label: "Dashboard", roles: ["ADMIN"] },
    { to: "/pos", label: "POS", roles: ["CASHIER", "ADMIN"] },
    { to: "/inventory", label: "Inventory", roles: ["PHARMACIST", "ADMIN"] },
    { to: "/reports", label: "Reports", roles: ["ACCOUNTANT", "ADMIN"] },
    { to: "/admin/create-user", label: "Staff", roles: ["ADMIN"] },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
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
