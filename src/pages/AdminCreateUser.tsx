import { useState } from "react";
import api from "../components/services/api";

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId: string;
  phone: string;
  salary: string;
  dateOfEmployment: string;
  department: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  shiftStart: string;
  shiftEnd: string;
};

export default function CreateUser() {
  const [form, setForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    role: "CASHIER",
    branchId: "",
    phone: "",
    salary: "",
    dateOfEmployment: new Date().toISOString().split("T")[0],
    department: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    shiftStart: "09:00",
    shiftEnd: "17:00",
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => setPicturePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    if (!form.name || !form.email || !form.password) {
      return "Name, email and password are required";
    }

    if (!form.email.includes("@")) {
      return "Enter a valid email address";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters";
    }

    if (!form.dateOfEmployment) {
      return "Date of employment is required";
    }

    if (!form.salary || parseFloat(form.salary) <= 0) {
      return "Please enter a valid salary";
    }

    if (!profilePicture) {
      return "Profile picture is required";
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
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "salary") {
          formData.append(key, String(Math.round(Number(value) * 100) / 100));
        } else if (key === "dateOfEmployment") {
          formData.append(key, new Date(value).toISOString());
        } else {
          formData.append(key, value);
        }
      });
      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }
      await api.post("/auth/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Employee created successfully");

      setForm({
        name: "",
        email: "",
        password: "",
        role: "CASHIER",
        branchId: "",
        phone: "",
        salary: "",
        dateOfEmployment: new Date().toISOString().split("T")[0],
        department: "",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        shiftStart: "09:00",
        shiftEnd: "17:00",
      });
      setProfilePicture(null);
      setPicturePreview(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to create employee"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* HEADER */}
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-[#124170]">Create Staff Account</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add a new staff member with their employment details
            </p>
          </div>

          {/* FEEDBACK */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-600">
              {success}
            </div>
          )}

          {/* PROFILE PICTURE SECTION */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Profile Picture *
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                {picturePreview ? (
                  <img
                    src={picturePreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#124170]/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-dashed border-gray-300 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block">
                  <span className="sr-only">Choose profile photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#124170] file:text-white hover:file:bg-[#0d2f52] file:cursor-pointer file:transition"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* BASIC INFO SECTION */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NAME */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                  placeholder="Your Name"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                  placeholder="yourname@pharmacy.com"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                  placeholder="••••••••"
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
            </div>
          </div>

          {/* EMPLOYMENT DETAILS SECTION */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Employment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ROLE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </select>
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                >
                  <option value="">Select Department</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Sales">Sales</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Management">Management</option>
                  <option value="Inventory">Inventory</option>
                </select>
              </div>

              {/* DATE OF EMPLOYMENT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Employment *
                </label>
                <input
                  type="date"
                  name="dateOfEmployment"
                  value={form.dateOfEmployment}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                />
              </div>

              {/* SALARY */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Salary (₵) *
                </label>
                <input
                  type="number"
                  name="salary"
                  value={form.salary}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                  placeholder="0.00"
                  step="any"
                />
              </div>

              {/* SHIFT START */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift Start
                </label>
                <input
                  type="time"
                  name="shiftStart"
                  value={form.shiftStart}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                />
              </div>

              {/* SHIFT END */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift End
                </label>
                <input
                  type="time"
                  name="shiftEnd"
                  value={form.shiftEnd}
                  onChange={handleChange}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* ADDRESS SECTION */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Address & Emergency Contact
            </h3>
            <div className="space-y-4">
              {/* ADDRESS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={2}
                  className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none resize-none"
                  placeholder="Enter full address..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* EMERGENCY CONTACT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={form.emergencyContact}
                    onChange={handleChange}
                    className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                    placeholder="Contact person name"
                  />
                </div>

                {/* EMERGENCY PHONE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={form.emergencyPhone}
                    onChange={handleChange}
                    className="border rounded-lg w-full px-3 py-2.5 focus:ring-2 focus:ring-[#67C090] focus:border-transparent outline-none"
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ACTION */}
          <div className="border-t pt-6">
            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-[#124170] text-white py-3 rounded-lg font-medium hover:bg-[#0d2f52] disabled:opacity-50 transition"
            >
              {loading ? "Creating Employee..." : "Create Employee"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
