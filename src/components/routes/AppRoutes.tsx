import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// Pages
import Dashboard from "../../pages/Dashboard";
import POS from "../../pages/POS";
import Inventory from "../../pages/Inventory";
import Employees from "../../pages/Employees";
import Reports from "../../pages/Reports";
import Login from "../../pages/Login";
import CreateUser from "../../pages/AdminCreateUser";

// Protected wrapper
const Protected = ({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) => {
  const user = useAuthStore((s) => s.user);

  // If not logged in -> go to login
  if (!user) return <Navigate to="/login" replace />;

  // If role not allowed -> unauthorized page or redirect
  if (roles.length && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Admin-only user creation */}
      <Route
        path="/admin/create-user"
        element={
          <Protected roles={["ADMIN"]}>
            <CreateUser />
          </Protected>
        }
      />

      {/* Protected dashboard routes */}
      <Route
        path="/"
        element={
          <Protected roles={["ADMIN"]}>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/pos"
        element={
          <Protected roles={["CASHIER", "ADMIN"]}>
            <POS />
          </Protected>
        }
      />
      <Route
        path="/inventory"
        element={
          <Protected roles={["PHARMACIST", "ADMIN"]}>
            <Inventory />
          </Protected>
        }
      />
      <Route
        path="/employees"
        element={
          <Protected roles={["ADMIN"]}>
            <Employees />
          </Protected>
        }
      />
      <Route
        path="/reports"
        element={
          <Protected roles={["ADMIN", "ACCOUNTANT"]}>
            <Reports />
          </Protected>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
