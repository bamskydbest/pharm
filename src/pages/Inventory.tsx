import { useEffect, useRef, useState } from "react";
import api from "../components/services/api";

type InventoryItem = {
  _id: string;
  name: string;
  quantity: number;
  category?: string;
};

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stock-in state
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<any>(null);
  const [form, setForm] = useState<any>({
    quantity: "",
    costPrice: "",
    sellingPrice: "",
    batchNumber: "",
    expiryDate: ""
  });

  const barcodeRef = useRef<HTMLInputElement>(null);

  /* ---------------- FETCH INVENTORY ---------------- */
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get<InventoryItem[]>("/inventory");
      setItems(res.data);
    } catch {
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  /* ---------------- BARCODE SCAN ---------------- */
  const handleScan = async () => {
    if (!barcode) return;

    try {
      const res = await api.get(`/inventory/scan/${barcode}`);
      setProduct(res.data.exists ? res.data.product : null);
    } catch {
      setProduct(null);
    }
  };

  /* ---------------- STOCK IN ---------------- */
  const submitStock = async () => {
if (!product) return alert("Please scan a valid product");

if (
  !form.quantity?.toString().trim() ||
  !form.costPrice?.toString().trim() ||
  !form.sellingPrice?.toString().trim() ||
  !form.batchNumber?.toString().trim() ||
  !form.expiryDate?.toString().trim()
) {
  return alert("Please fill all stock details");
}


  try {
    await api.post("/inventory/stock-in", {
      barcode,
      name: product.name,
      category: product.category,
      batchNumber: form.batchNumber,
      expiryDate: new Date(form.expiryDate), // ensure Date object
      quantity: Number(form.quantity),
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
    });

    setBarcode("");
    setProduct(null);
    setForm({
      quantity: "",
      costPrice: "",
      sellingPrice: "",
      batchNumber: "",
      expiryDate: ""
    });

    fetchInventory();
    barcodeRef.current?.focus();
  } catch (err: any) {
    console.error(err.response?.data || err.message);
    alert("Failed to add stock: " + (err.response?.data?.message || err.message));
  }
};


  /* ---------------- UI ---------------- */
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-gray-500">
          Manage stock & availability
        </p>
      </div>

      {/* STOCK IN PANEL */}
      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
        <h2 className="font-medium">Stock In</h2>

        <input
          ref={barcodeRef}
          autoFocus
          placeholder="Scan or enter barcode"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
        />

        {barcode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Quantity"
              type="number"
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: e.target.value })
              }
            />
            <input
              placeholder="Cost Price"
              type="number"
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.costPrice}
              onChange={(e) =>
                setForm({ ...form, costPrice: e.target.value })
              }
            />
            <input
              placeholder="Selling Price"
              type="number"
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.sellingPrice}
              onChange={(e) =>
                setForm({ ...form, sellingPrice: e.target.value })
              }
            />
            <input
              placeholder="Batch Number"
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.batchNumber}
              onChange={(e) =>
                setForm({ ...form, batchNumber: e.target.value })
              }
            />
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.expiryDate}
              onChange={(e) =>
                setForm({ ...form, expiryDate: e.target.value })
              }
            />
          </div>
        )}

        <button
          onClick={submitStock}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Add Stock
        </button>
      </div>

      {/* INVENTORY LIST */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h2 className="font-medium mb-4">Current Stock</h2>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && items.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-8">
            No inventory items yet. Start by stocking products above.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="divide-y">
            {items.map((i) => (
              <div
                key={i._id}
                className="flex justify-between py-3 text-sm"
              >
                <span>{i.name}</span>
                <span className="font-medium">
                  {i.quantity} units
                </span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
