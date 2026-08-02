import type { Transaction } from "@/lib/types";
import { monthKey } from "@/lib/utils";

export function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((s, it) => s + (fn(it) || 0), 0);
}

export function txForMonth(transactions: Transaction[], mk: string): Transaction[] {
  return transactions.filter((t) => t.occurred_on.slice(0, 7) === mk);
}

export function monthTotals(transactions: Transaction[], mk: string) {
  const txs = txForMonth(transactions, mk);
  const income = sumBy(txs.filter((t) => t.type === "income"), (t) => t.amount);
  const expenses = sumBy(txs.filter((t) => t.type === "expense"), (t) => t.amount);
  const savings = sumBy(txs.filter((t) => t.type === "savings"), (t) => t.amount);
  const remaining = income - expenses - savings;
  return { txs, income, expenses, savings, remaining };
}

export function yearTotals(transactions: Transaction[], year: string) {
  const txs = transactions.filter((t) => t.occurred_on.slice(0, 4) === year);
  const savings = sumBy(txs.filter((t) => t.type === "savings"), (t) => t.amount);
  const expenses = sumBy(txs.filter((t) => t.type === "expense"), (t) => t.amount);
  return { savings, expenses };
}

export function lastNMonths(mk: string, n: number): string[] {
  const [y, m] = mk.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

export function biggestExpense(transactions: Transaction[], mk: string) {
  const txs = txForMonth(transactions, mk).filter((t) => t.type === "expense");
  if (!txs.length) return null;
  return txs.reduce((max, t) => (t.amount > max.amount ? t : max), txs[0]);
}

export function categoryBreakdown(transactions: Transaction[], mk: string) {
  const txs = txForMonth(transactions, mk).filter((t) => t.type === "expense" || t.type === "savings");
  const map = new Map<string, { name: string; icon: string; color: string; spent: number; categoryId: string }>();
  txs.forEach((t) => {
    if (!t.category) return;
    const key = t.category.id;
    const existing = map.get(key);
    if (existing) existing.spent += t.amount;
    else map.set(key, { name: t.category.name, icon: t.category.icon, color: t.category.color, spent: t.amount, categoryId: t.category.id });
  });
  return Array.from(map.values());
}

export function topN<T>(items: T[], fn: (item: T) => number, n: number): T[] {
  return [...items].sort((a, b) => fn(b) - fn(a)).slice(0, n);
}
