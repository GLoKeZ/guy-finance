import type { Transaction, Subscription, Profile } from "@/lib/types";
import { monthTotals } from "@/lib/finance-calc";
import { formatMoney, formatPercent, monthKey, daysLeftInMonth } from "@/lib/utils";

export interface Insight {
  icon: string;
  text: string;
  tone: "good" | "warn" | "info";
}

function prevMonthKey(mk: string) {
  const d = new Date(mk + "-01");
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Deterministic, rule-based insights computed directly from the user's own data — no external AI call, no cost, no latency. */
export function generateInsights(
  transactions: Transaction[],
  subscriptions: Subscription[],
  profile: Profile,
  month: string
): Insight[] {
  const insights: Insight[] = [];
  const currency = profile.currency;

  // This week vs last week, by category
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

  const thisWeek = transactions.filter((t) => t.type === "expense" && new Date(t.occurred_on) >= weekAgo);
  const lastWeek = transactions.filter((t) => t.type === "expense" && new Date(t.occurred_on) >= twoWeeksAgo && new Date(t.occurred_on) < weekAgo);

  const byCatThisWeek = new Map<string, number>();
  thisWeek.forEach((t) => { if (t.category) byCatThisWeek.set(t.category.name, (byCatThisWeek.get(t.category.name) ?? 0) + t.amount); });
  const byCatLastWeek = new Map<string, number>();
  lastWeek.forEach((t) => { if (t.category) byCatLastWeek.set(t.category.name, (byCatLastWeek.get(t.category.name) ?? 0) + t.amount); });

  byCatThisWeek.forEach((amount, cat) => {
    const prev = byCatLastWeek.get(cat) ?? 0;
    if (prev > 50) {
      const diffPct = ((amount - prev) / prev) * 100;
      if (diffPct >= 15) {
        insights.push({ icon: "📈", text: `השבוע הוצאת ${formatPercent(diffPct)} יותר על ${cat} לעומת השבוע שעבר.`, tone: "warn" });
      } else if (diffPct <= -15) {
        insights.push({ icon: "📉", text: `השבוע הוצאת ${formatPercent(-diffPct)} פחות על ${cat} לעומת השבוע שעבר — כל הכבוד!`, tone: "good" });
      }
    }
  });

  // Month-end projection based on current daily burn rate
  const { expenses, income, savings } = monthTotals(transactions, month);
  const isCurrentMonth = month === monthKey(new Date());
  if (isCurrentMonth) {
    const now2 = new Date();
    const dayOfMonth = now2.getDate();
    const daysInMonth = dayOfMonth + daysLeftInMonth();
    const dailyRate = expenses / Math.max(dayOfMonth, 1);
    const projectedExpenses = dailyRate * daysInMonth;
    const salary = profile.monthly_salary || income;
    const projectedRemaining = salary - projectedExpenses - savings;
    insights.push({
      icon: projectedRemaining >= 0 ? "🔮" : "⚠️",
      text: `אם תמשיך בקצב הזה, תסיים את החודש עם ${formatMoney(projectedRemaining, currency)}.`,
      tone: projectedRemaining >= 0 ? "info" : "warn",
    });
  }

  // Upcoming subscription charges (within 3 days)
  const today = new Date().getDate();
  subscriptions.filter((s) => s.active).forEach((s) => {
    const diff = s.billing_day - today;
    if (diff >= 0 && diff <= 3) {
      insights.push({
        icon: "🔔",
        text: diff === 0 ? `המנוי ${s.name} מחויב היום (${formatMoney(s.amount, currency)}).` : `המנוי ${s.name} יחויב בעוד ${diff} ${diff === 1 ? "יום" : "ימים"} (${formatMoney(s.amount, currency)}).`,
        tone: "info",
      });
    }
  });

  // Savings goal status
  if (isCurrentMonth) {
    if (savings >= profile.monthly_savings_target && profile.monthly_savings_target > 0) {
      insights.push({ icon: "✅", text: `עמדת ביעד החיסכון החודשי (${formatMoney(profile.monthly_savings_target, currency)}). מעולה!`, tone: "good" });
    } else if (profile.monthly_savings_target > 0) {
      const missing = profile.monthly_savings_target - savings;
      insights.push({ icon: "🎯", text: `נותרו ${formatMoney(missing, currency)} כדי להגיע ליעד החיסכון החודשי.`, tone: "warn" });
    }
  }

  // Max spending cap
  if (profile.max_spending > 0) {
    const pctUsed = (expenses / profile.max_spending) * 100;
    if (pctUsed >= 100) {
      insights.push({ icon: "🚨", text: `חרגת מתקרת ההוצאות החודשית שקבעת (${formatMoney(profile.max_spending, currency)}).`, tone: "warn" });
    } else if (pctUsed >= 80) {
      insights.push({ icon: "⚠️", text: `הגעת ל-${formatPercent(pctUsed)} מתקרת ההוצאות החודשית שלך.`, tone: "warn" });
    }
  }

  // Month-over-month comparison
  const prevMk = prevMonthKey(month);
  const prevExpenses = monthTotals(transactions, prevMk).expenses;
  if (prevExpenses > 0) {
    const diffPct = ((expenses - prevExpenses) / prevExpenses) * 100;
    if (Math.abs(diffPct) >= 10) {
      insights.push({
        icon: "📊",
        text: `ההוצאות החודש ${diffPct > 0 ? "גבוהות" : "נמוכות"} ב-${formatPercent(Math.abs(diffPct))} לעומת החודש הקודם.`,
        tone: diffPct > 0 ? "warn" : "good",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({ icon: "👍", text: "הכל נראה מאוזן — אין כרגע התראות מיוחדות.", tone: "good" });
  }

  return insights;
}
