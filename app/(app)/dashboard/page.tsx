"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMonth } from "@/lib/month-context";
import { useRealtimeSync } from "@/lib/use-realtime-sync";
import { getTransactions } from "@/lib/actions/transactions";
import { getBudgets } from "@/lib/actions/budgets";
import { getGoals } from "@/lib/actions/goals";
import { getInvestments } from "@/lib/actions/investments";
import { getOrCreateProfile } from "@/lib/actions/profile";
import type { Transaction, Budget, Goal, Profile, Investment } from "@/lib/types";
import { monthTotals, yearTotals, lastNMonths, biggestExpense, categoryBreakdown, sumBy } from "@/lib/finance-calc";
import { formatMoney, formatPercent, monthLabel, daysUntil, daysLeftInMonth } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { CategoryProgress } from "@/components/category-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart } from "@/components/charts/donut-chart";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";

export default function DashboardPage() {
  const { month } = useMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, b, g, inv, p] = await Promise.all([
        getTransactions({ limit: 3000 }),
        getBudgets(),
        getGoals(),
        getInvestments(),
        getOrCreateProfile(),
      ]);
      setTransactions(txs);
      setBudgets(b);
      setGoals(g);
      setInvestments(inv);
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeSync("transactions", load);
  useRealtimeSync("budgets", load);
  useRealtimeSync("goals", load);
  useRealtimeSync("investments", load);

  if (loading || !profile) return <DashboardSkeleton />;

  const currency = profile.currency;
  const { income, expenses, savings, remaining } = monthTotals(transactions, month);
  const year = month.slice(0, 4);
  const yTotals = yearTotals(transactions, year);
  const big = biggestExpense(transactions, month);
  const catRows = categoryBreakdown(transactions, month);
  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.monthly_amount]));
  const totalBudget = sumBy(budgets, (b) => b.monthly_amount);
  const totalSpent = sumBy(catRows, (c) => c.spent);
  const budgetUtil = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isCurrentMonth = month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const investedTotal = sumBy(investments, (i) => i.current_value);
  const salary = profile.monthly_salary || income;
  const availableToSpend = Math.max(salary - expenses - savings, 0);
  const monthPct = salary > 0 ? Math.min((remaining / salary) * 100, 100) : 0;

  const months = lastNMonths(month, 6);
  const barData = months.map((mk) => {
    const t = monthTotals(transactions, mk);
    return { month: monthLabel(mk).split(" ")[0], income: t.income, expenses: t.expenses, savings: t.savings };
  });

  const donutData = catRows.map((c) => ({ name: c.name, value: c.spent, color: c.color }));

  const alerts: { icon: React.ReactNode; text: string; tone: "warn" | "danger" | "ok" }[] = [];
  if (remaining < 0) alerts.push({ icon: <AlertTriangle className="h-4 w-4" />, text: `חרגת מהתקציב ב-${formatMoney(-remaining, currency)} החודש.`, tone: "danger" });
  if (isCurrentMonth && savings < profile.monthly_savings_target) {
    const missing = profile.monthly_savings_target - savings;
    alerts.push({ icon: <AlertTriangle className="h-4 w-4" />, text: `החיסכון החודשי (${formatMoney(savings, currency)}) נמוך מהיעד. חסר עוד ${formatMoney(missing, currency)}.`, tone: "warn" });
  }
  if (profile.max_spending > 0 && expenses > profile.max_spending) {
    alerts.push({ icon: <AlertTriangle className="h-4 w-4" />, text: `חרגת מתקרת ההוצאות שקבעת (${formatMoney(profile.max_spending, currency)}).`, tone: "danger" });
  }
  catRows.forEach((c) => {
    const budget = budgetMap.get(c.categoryId) ?? 0;
    if (budget > 0 && c.spent >= budget) {
      alerts.push({ icon: <AlertTriangle className="h-4 w-4" />, text: `${c.name}: חריגה מהתקציב (${formatMoney(c.spent, currency)} מתוך ${formatMoney(budget, currency)}).`, tone: "danger" });
    }
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-card to-accent/10">
          <CardContent className="p-5 sm:p-6">
            <p className="text-lg font-bold">שלום גיא 👋</p>
            <p className="mt-1 text-xs text-muted-foreground">{monthLabel(month)}</p>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground">החודש נשאר לך</div>
              <div className={`font-tabular text-4xl font-extrabold ${remaining < 0 ? "text-destructive" : "text-primary"}`}>
                {formatMoney(remaining, currency)}
              </div>
            </div>
            <div className="mt-4">
              <Progress value={monthPct} indicatorClassName={remaining < 0 ? "bg-destructive" : "bg-primary"} />
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{formatPercent(monthPct)} מהמשכורת נותר</span>
                {isCurrentMonth && <span>{daysLeftInMonth()} ימים נותרו החודש</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <Alert tone="ok" icon={<CheckCircle2 className="h-4 w-4" />} text="הכל נראה מאוזן החודש. כל הכבוד!" />
        ) : (
          alerts.map((a, i) => <Alert key={i} tone={a.tone} icon={a.icon} text={a.text} />)
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="הכנסה החודש" value={formatMoney(income, currency)} delay={0} />
        <StatCard label="הוצאות החודש" value={formatMoney(expenses, currency)} tone="destructive" delay={0.03} />
        <StatCard label="חיסכון החודש" value={formatMoney(savings, currency)} tone="primary" foot={`${formatPercent(income > 0 ? (savings / income) * 100 : 0)} מההכנסה`} delay={0.06} />
        <StatCard label="השקעות" value={formatMoney(investedTotal, currency)} tone="accent" delay={0.09} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="כסף פנוי" value={formatMoney(availableToSpend, currency)} tone={availableToSpend <= 0 ? "destructive" : "accent"} />
        <StatCard label="ימים למשכורת" value={String(daysUntil(profile.salary_day))} foot={`יום תשלום: ${profile.salary_day}`} />
        <StatCard label="ניצול תקציב" value={formatPercent(budgetUtil)} tone={budgetUtil >= 100 ? "destructive" : budgetUtil >= 80 ? "warning" : "primary"} foot={`${formatMoney(totalSpent, currency)} / ${formatMoney(totalBudget, currency)}`} />
        <StatCard label="ההוצאה הגדולה החודש" value={big ? formatMoney(big.amount, currency) : "—"} tone="destructive" foot={big?.description} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={`חיסכון ב-${year}`} value={formatMoney(yTotals.savings, currency)} tone="primary" />
        <StatCard label={`הוצאות ב-${year}`} value={formatMoney(yTotals.expenses, currency)} tone="destructive" />
        <StatCard label="יעד חיסכון חודשי" value={formatMoney(profile.monthly_savings_target, currency)} tone={savings >= profile.monthly_savings_target ? "primary" : "warning"} foot={`בפועל: ${formatMoney(savings, currency)}`} />
        <StatCard label="יעד השקעה" value={formatMoney(profile.investment_target, currency)} tone={investedTotal >= profile.investment_target ? "primary" : "warning"} foot={`בפועל: ${formatMoney(investedTotal, currency)}`} />
      </div>

      {goals.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>יעדי חיסכון</CardTitle>
            <Link href="/savings" className="text-xs text-primary">לכל היעדים ←</Link>
          </CardHeader>
          <CardContent>
            {goals.slice(0, 4).map((g) => {
              const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0;
              return (
                <div key={g.id} className="mb-3">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{g.icon} {g.name}</span>
                    <span className="font-tabular text-xs text-muted-foreground">{formatMoney(g.current_amount, currency)} / {formatMoney(g.target_amount, currency)}</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>תקציב לפי קטגוריה</CardTitle>
          <Link href="/settings" className="text-xs text-primary">עריכת תקציב ←</Link>
        </CardHeader>
        <CardContent>
          {catRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">אין הוצאות רשומות החודש עדיין.</p>
          ) : (
            catRows.map((c) => (
              <CategoryProgress key={c.categoryId} icon={c.icon} name={c.name} spent={c.spent} budget={budgetMap.get(c.categoryId) ?? 0} currency={currency} />
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>הוצאות לפי קטגוריה</CardTitle></CardHeader>
          <CardContent><DonutChart data={donutData} currency={currency} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>השוואה בין חודשים</CardTitle></CardHeader>
          <CardContent><MonthlyBarChart data={barData} currency={currency} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function Alert({ tone, icon, text }: { tone: "warn" | "danger" | "ok"; icon: React.ReactNode; text: string }) {
  const toneClass = {
    warn: "bg-warning/10 border-warning/30 text-warning",
    danger: "bg-destructive/10 border-destructive/30 text-destructive",
    ok: "bg-primary/10 border-primary/30 text-primary",
  }[tone];
  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${toneClass}`}>
      {icon}
      <span className="text-foreground/90">{text}</span>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
