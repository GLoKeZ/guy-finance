"use client";
import { useEffect, useState, useCallback } from "react";
import { useMonth } from "@/lib/month-context";
import { getTransactions } from "@/lib/actions/transactions";
import { getOrCreateProfile } from "@/lib/actions/profile";
import type { Transaction, Profile } from "@/lib/types";
import { txForMonth, sumBy, topN } from "@/lib/finance-calc";
import { formatMoney, formatPercent, formatDate, monthLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function prevMonthKey(mk: string) {
  const d = new Date(mk + "-01");
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const { month } = useMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [txs, p] = await Promise.all([getTransactions({ limit: 3000 }), getOrCreateProfile()]);
    setTransactions(txs);
    setProfile(p);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const currency = profile.currency;
  const txs = txForMonth(transactions, month).filter((t) => t.type === "expense");
  const totalSpent = sumBy(txs, (t) => t.amount);

  const byMerchant = new Map<string, number>();
  txs.forEach((t) => byMerchant.set(t.description, (byMerchant.get(t.description) ?? 0) + t.amount));
  const topMerchants = topN(Array.from(byMerchant.entries()), ([, v]) => v, 10);

  const byCategory = new Map<string, { name: string; icon: string; total: number }>();
  txs.forEach((t) => {
    if (!t.category) return;
    const existing = byCategory.get(t.category.id);
    if (existing) existing.total += t.amount;
    else byCategory.set(t.category.id, { name: t.category.name, icon: t.category.icon, total: t.amount });
  });
  const topCategories = topN(Array.from(byCategory.values()), (c) => c.total, 10);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const avgDaily = totalSpent / daysInMonth;
  const avgWeekly = avgDaily * 7;

  const byDay = new Map<string, number>();
  txs.forEach((t) => byDay.set(t.occurred_on, (byDay.get(t.occurred_on) ?? 0) + t.amount));
  let priciestDay: { date: string; amount: number } | null = null;
  byDay.forEach((amount, date) => {
    if (!priciestDay || amount > priciestDay.amount) priciestDay = { date, amount };
  });

  const byWeek = new Map<number, number>();
  txs.forEach((t) => {
    const d = new Date(t.occurred_on);
    const w = Math.floor((d.getDate() - 1) / 7);
    byWeek.set(w, (byWeek.get(w) ?? 0) + t.amount);
  });
  let priciestWeek: { week: number; amount: number } | null = null;
  byWeek.forEach((amount, w) => {
    if (!priciestWeek || amount > priciestWeek.amount) priciestWeek = { week: w + 1, amount };
  });

  const prevMk = prevMonthKey(month);
  const prevTotal = sumBy(txForMonth(transactions, prevMk).filter((t) => t.type === "expense"), (t) => t.amount);
  const diff = totalSpent - prevTotal;
  const diffPct = prevTotal > 0 ? (diff / prevTotal) * 100 : 0;

  return (
    <div>
      <PageHeader title="דוחות" subtitle={`ניתוח מעמיק — ${monthLabel(month)}`} />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="ממוצע הוצאה יומי" value={formatMoney(avgDaily, currency)} />
        <StatCard label="ממוצע הוצאה שבועי" value={formatMoney(avgWeekly, currency)} />
        <StatCard label="היום היקר ביותר" value={priciestDay ? formatMoney((priciestDay as { date: string; amount: number }).amount, currency) : "—"} tone="destructive" foot={priciestDay ? formatDate((priciestDay as { date: string; amount: number }).date) : undefined} />
        <StatCard label="השבוע היקר ביותר" value={priciestWeek ? formatMoney((priciestWeek as { week: number; amount: number }).amount, currency) : "—"} tone="destructive" foot={priciestWeek ? `שבוע ${(priciestWeek as { week: number; amount: number }).week}` : undefined} />
      </div>

      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">לעומת החודש הקודם ({monthLabel(prevMk)})</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`font-tabular text-xl font-bold ${diff > 0 ? "text-destructive" : "text-primary"}`}>
              {diff > 0 ? "+" : ""}{formatMoney(diff, currency)}
            </span>
            <span className="text-xs text-muted-foreground">{diff > 0 ? "יותר" : "פחות"} מהחודש הקודם ({diff > 0 ? "+" : ""}{formatPercent(diffPct)})</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>10 בתי העסק המובילים</CardTitle></CardHeader>
          <CardContent>
            {topMerchants.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">אין הוצאות עדיין</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {topMerchants.map(([name, total], i) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2">{name}</td>
                      <td className="py-2 text-right font-tabular font-medium">{formatMoney(total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>10 הקטגוריות המובילות</CardTitle></CardHeader>
          <CardContent>
            {topCategories.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">אין הוצאות עדיין</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {topCategories.map((c, i) => (
                    <tr key={c.name} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2">{c.icon} {c.name}</td>
                      <td className="py-2 text-right font-tabular font-medium">{formatMoney(c.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
