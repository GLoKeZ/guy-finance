"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import { monthKey } from "@/lib/utils";

export interface DueCharge {
  subscriptionId: string;
  name: string;
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string;
  billingDay: number;
  occurredOn: string;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns subscriptions that are active + have auto-charge enabled, whose
 * billing day for `month` (YYYY-MM) has already passed and don't already
 * have a generated transaction for that exact billing period. Never
 * mutates anything — used both for the preview dialog and as the source
 * of truth for what generateSubscriptionCharges will create.
 */
export async function getDueSubscriptionCharges(month: string): Promise<DueCharge[]> {
  const { supabase } = await requireUser();
  const [year, m] = month.split("-").map(Number);

  const currentMonth = monthKey(new Date());
  if (month > currentMonth) return [];

  const isCurrentMonth = month === currentMonth;
  const todayDay = new Date().getDate();
  const lastDay = daysInMonth(year, m);

  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*, category:categories(*)")
    .eq("active", true)
    .eq("auto_charge_enabled", true);
  if (error) throw error;

  const { data: existing, error: existingErr } = await supabase
    .from("transactions")
    .select("subscription_id")
    .eq("billing_year", year)
    .eq("billing_month", m)
    .not("subscription_id", "is", null);
  if (existingErr) throw existingErr;
  const existingSet = new Set((existing ?? []).map((t) => t.subscription_id as string));

  return (subs ?? [])
    .filter((s) => {
      if (existingSet.has(s.id)) return false;
      const dayInMonth = Math.min(s.billing_day, lastDay);
      if (isCurrentMonth) return dayInMonth <= todayDay;
      return true;
    })
    .map((s) => {
      const day = Math.min(s.billing_day, lastDay);
      return {
        subscriptionId: s.id,
        name: s.name,
        amount: s.amount,
        categoryId: s.category_id,
        categoryName: s.category?.name ?? null,
        categoryIcon: s.category?.icon ?? "🔁",
        billingDay: s.billing_day,
        occurredOn: `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      };
    });
}

/** Sum of active subscriptions' monthly amounts — "עלות מנויים צפויה" (expected, regardless of whether a transaction was actually recorded). */
export async function getProjectedSubscriptionCost(): Promise<number> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("subscriptions").select("amount").eq("active", true);
  if (error) throw error;
  return (data ?? []).reduce((sum, s) => sum + Number(s.amount), 0);
}

/** Transactions actually generated from subscriptions for a given month — "חיובים שנרשמו בפועל". */
export async function getActualSubscriptionCharges(month: string) {
  const { supabase } = await requireUser();
  const [year, m] = month.split("-").map(Number);
  const { data, error } = await supabase
    .from("transactions")
    .select("id, subscription_id, amount, occurred_on, description")
    .eq("billing_year", year)
    .eq("billing_month", m)
    .not("subscription_id", "is", null);
  if (error) throw error;
  return data ?? [];
}

/**
 * Creates transactions for the given (or all due) subscription charges in `month`.
 * Idempotent: relies on getDueSubscriptionCharges to exclude anything already
 * generated, plus a DB-level partial unique index (user_id, subscription_id,
 * billing_year, billing_month) as a hard safety net against race duplicates.
 */
export async function generateSubscriptionCharges(month: string, subscriptionIds?: string[]) {
  const { supabase, user } = await requireUser();
  const due = await getDueSubscriptionCharges(month);
  const toCreate = subscriptionIds ? due.filter((d) => subscriptionIds.includes(d.subscriptionId)) : due;
  if (toCreate.length === 0) return { created: 0 };

  const [year, m] = month.split("-").map(Number);
  const rows = toCreate.map((d) => ({
    user_id: user.id,
    type: "expense" as const,
    amount: d.amount,
    category_id: d.categoryId,
    description: d.name,
    occurred_on: d.occurredOn,
    is_recurring: true,
    subscription_id: d.subscriptionId,
    billing_year: year,
    billing_month: m,
    note: "נוצר אוטומטית ממנוי",
  }));

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { created: 0 };
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/subscriptions");
  revalidatePath("/reports");
  return { created: rows.length };
}
