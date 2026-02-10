import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type ChartDataInput = {
  name: string;
  value: number;
};

const COLORS = ["#67C090", "#124170", "#A7D7C5", "#E8A838", "#E06469"];

export default function SalesPieChart({ data }: { data: any[] }) {
  const grouped: ChartDataInput[] = Object.values(
    data.reduce<Record<string, ChartDataInput>>((acc, curr) => {
      const key = (curr.paymentMethod || "CASH").toUpperCase();

      if (!acc[key]) {
        acc[key] = { name: key, value: 0 };
      }

      acc[key].value += curr.subtotal || curr.total || 0;
      return acc;
    }, {})
  );

  if (!grouped.length) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-sm text-gray-400">
        No sales data available
      </div>
    );
  }

  const total = grouped.reduce((s, g) => s + g.value, 0);

  return (
    <div className="w-full">
      <div className="h-52">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={grouped}
              dataKey="value"
              nameKey="name"
              outerRadius={75}
              innerRadius={40}
              paddingAngle={3}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={{ strokeWidth: 1 }}
            >
              {grouped.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | string | undefined) => [`₵${Number(value ?? 0).toLocaleString()}`, "Amount"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below chart */}
      <div className="mt-2 space-y-1.5">
        {grouped.map((g, i) => (
          <div key={g.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-gray-600">{g.name}</span>
            </div>
            <span className="font-semibold text-[#124170]">₵{g.value.toLocaleString()}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs pt-1.5 border-t mt-1.5">
          <span className="font-medium text-gray-600">Total</span>
          <span className="font-bold text-[#124170]">₵{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
