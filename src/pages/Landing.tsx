import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">Smart POS System</h1>

        <div className="flex gap-4 justify-center">
          <button
            className="bg-blue-600 text-white px-6 py-2"
            onClick={() => navigate("/register")}
          >
            Register
          </button>

          <button
            className="border px-6 py-2"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
