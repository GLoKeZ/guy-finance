"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatMoney } from "@/lib/utils";

export interface MonthlyDatum {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export function MonthlyBarChart({ data, currency = "ILS" }: { data: MonthlyDatum[]; currency?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => formatMoney(value, currency)}
          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="income" fill="#4C8DFF" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" fill="#F2555A" radius={[3, 3, 0, 0]} />
        <Bar dataKey="savings" fill="#3ECF8E" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
