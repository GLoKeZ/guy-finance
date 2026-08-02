"use client";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/utils";

export function TrendSparkline({ data, color = "#4C8DFF" }: { data: { label: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          formatter={(value: number) => formatMoney(value)}
          labelFormatter={() => ""}
          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#sparkFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
