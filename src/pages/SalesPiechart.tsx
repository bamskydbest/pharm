import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type ChartDataInput = {
  name: string;
  value: number;
};

const COLORS = ["#67C090", "#124170", "#A7D7C5"];

export default function SalesPieChart({ data }: { data: any[] }) {
  const grouped: ChartDataInput[] = Object.values(
    data.reduce<Record<string, ChartDataInput>>((acc, curr) => {
      const key = curr.paymentMethod;

      if (!acc[key]) {
        acc[key] = { name: key, value: 0 };
      }

      acc[key].value += curr.total;
      return acc;
    }, {})
  );

  // ✅ EMPTY STATE — PUT IT HERE
  if (!grouped.length) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-gray-400">
        No sales data available
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={grouped}
            dataKey="value"
            nameKey="name"
            outerRadius={80}
          >
            {grouped.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>

          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
