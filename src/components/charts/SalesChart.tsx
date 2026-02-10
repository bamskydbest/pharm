import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";

export default function SalesChart({ data }: any) {
  // Normalize data key — backend may return "date" or "_id"
  const normalized = data.map((d: any) => ({
    ...d,
    date: d.date || d._id,
    label: d.date
      ? new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d._id,
  }));

  const formatAmount = (value: number) => {
    if (value >= 1000) return `₵${(value / 1000).toFixed(1)}k`;
    return `₵${value}`;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={normalized} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#67C090" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#67C090" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#999" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tickFormatter={formatAmount}
            tick={{ fontSize: 10, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            formatter={(value: number) => [`₵${value.toLocaleString()}`, "Sales"]}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#67C090"
            strokeWidth={2}
            fill="url(#salesGradient)"
            dot={{ r: 3, fill: "#67C090", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#124170" }}
          >
            {normalized.length <= 15 && (
              <LabelList
                dataKey="total"
                position="top"
                formatter={formatAmount}
                style={{ fontSize: 9, fill: "#124170", fontWeight: 600 }}
              />
            )}
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
