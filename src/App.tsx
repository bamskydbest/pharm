import { BrowserRouter, useLocation } from "react-router-dom";
import AppRoutes from "./components/routes/AppRoutes";
import Navbar from "./pages/Navbar";

function AppContent() {
  const location = useLocation();

  // Hide navbar on login page
  const hideNavbar = location.pathname === "/login";

  return (
    <>
      {!hideNavbar && <Navbar />}
      <AppRoutes />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
