import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../components/services/api";
import { useAuthStore } from "../components/store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/auth/login", {
        email: email.toLowerCase().trim(),
        password,
      });

      login(data.token, data.user);

      switch (data.user.role) {
        case "ADMIN":
          navigate("/");
          break;
        case "CASHIER":
          navigate("/pos");
          break;
        case "PHARMACIST":
          navigate("/inventory");
          break;
        case "ACCOUNTANT":
          navigate("/accounting");
          break;
        default:
          navigate("/");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else {
        setError("Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex bg-[#F4F7F6]">
      {/* Left side — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#124170] to-[#0a2a4a] items-center justify-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-64 h-64 bg-[#67C090]/10 rounded-full" />
        <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 bg-[#67C090]/10 rounded-full" />
        <div className="absolute top-1/3 right-10 w-40 h-40 bg-[#67C090]/5 rounded-full" />

        <div className="relative z-10 text-center px-12 max-w-lg">
          {/* Logo icon */}
          <div className="w-20 h-20 bg-[#67C090] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">PharmacyPOS</h1>
          <p className="text-[#67C090] text-lg font-medium mb-3">
            Pharmacy Management System
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            Manage your inventory, sales, employees, and reports all in one place.
            Streamline your pharmacy operations with our comprehensive solution.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {["POS", "Inventory", "Payroll", "Reports", "Attendance"].map((f) => (
              <span
                key={f}
                className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-medium border border-white/10"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-[#124170] rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#67C090]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#124170]">PharmacyPOS</h1>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#124170]">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="you@pharmacy.com"
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090] focus:border-transparent transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#67C090] focus:border-transparent transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Sign in button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-[#124170] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#0d2f52] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            PharmacyPOS &copy; {new Date().getFullYear()}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
