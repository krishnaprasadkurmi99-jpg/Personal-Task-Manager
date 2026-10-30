import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type ProductivityPoint = {
  day: string;
  focus: number;
  completed: number;
};

export function WeeklyProductivityChart({ data }: { data: ProductivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 6, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="productivityGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.28} />
            <stop offset="92%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="focusGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.2} />
            <stop offset="92%" stopColor="#6ee7b7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.055)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="day"
          tick={{ fill: "#777585", fontSize: 10, fontFamily: "DM Sans" }}
          tickLine={false}
          tickMargin={13}
        />
        <Tooltip
          contentStyle={{
            background: "#191927",
            border: "1px solid rgba(167,139,250,.2)",
            borderRadius: 12,
            color: "#f5f3ff",
            fontSize: 12,
          }}
          formatter={(value, name) => [
            name === "focus" ? `${value} hours` : `${value} tasks`,
            name === "focus" ? "Focus time" : "Completed",
          ]}
          labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
        />
        <Area
          activeDot={{ r: 4, fill: "#c4b5fd", stroke: "#191927", strokeWidth: 3 }}
          dataKey="completed"
          fill="url(#productivityGradient)"
          stroke="#a78bfa"
          strokeWidth={2.2}
          type="monotone"
        />
        <Area
          activeDot={{ r: 4, fill: "#6ee7b7", stroke: "#191927", strokeWidth: 3 }}
          dataKey="focus"
          fill="url(#focusGradient)"
          stroke="#6ee7b7"
          strokeWidth={1.8}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
