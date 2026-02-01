import { useState } from "react";
import api from "../components/services/api";

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId: string;
};

export default function CreateUser() {
  const [form, setForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    role: "CASHIER",
    branchId: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.name || !form.email || !form.password) {
      return "All fields are required";
    }

    if (!form.email.includes("@")) {
      return "Enter a valid email address";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters";
    }

    return null;
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/register", form);
      setSuccess("User created successfully");

      setForm({
        name: "",
        email: "",
        password: "",
        role: "CASHIER",
        branchId: "",
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to create user"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* HEADER */}
        <div>
          <h2 className="text-xl font-bold">Create Staff Account</h2>
          <p className="text-sm text-gray-500">
            Add a new staff member and assign their role
          </p>
        </div>

        {/* FEEDBACK */}
        {error && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded bg-green-50 border border-green-200 text-sm text-green-600">
            {success}
          </div>
        )}

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* NAME */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="border rounded w-full p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Your Name"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="border rounded w-full p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="youremail@email.com"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="border rounded w-full p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="border rounded w-full p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ADMIN">Admin</option>
              <option value="CASHIER">Cashier</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="ACCOUNTANT">Accountant</option>
            </select>
          </div>
        </div>

        {/* ACTION */}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating user..." : "Create User"}
        </button>
      </div>
    </div>
  );
}
