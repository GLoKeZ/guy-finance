"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import { getOrCreateProfile } from "./profile";
import { SAVINGS_NAME, EMERGENCY_NAME, RESERVE_NAME, FREE_MONEY_NAME, RESERVE_ICON, FREE_MONEY_ICON } from "@/lib/smart-budget-constants";

const ESSENTIAL_KEYWORDS = ["אוכל", "דלק", "בריאות"];
// Priority order when cutting a budget shortfall. Trading accounts are handled
// separately at the very end since a plain substring match on "מסחר" would
// also catch "מסחר - כלים" (Trading Tools), which isn't in the user's cut list.
const DECREASE_ORDER = [FREE_MONEY_NAME, RESERVE_NAME, "טיולים", "קניות", "בילויים", "מתנות"];

function isEssential(name: string) {
  return ESSENTIAL_KEYWORDS.some((k) => name.includes(k));
}
function isTradingAccounts(name: string) {
  return name.includes("מסחר") && name.includes("חשבונות");
}
function isSpecialCategory(name: string) {
  return name === SAVINGS_NAME || name === EMERGENCY_NAME || name === RESERVE_NAME || name === FREE_MONEY_NAME;
}

export interface BudgetRow {
  budgetId: string | null;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  locked: boolean;
}

export interface ReallocationChange {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  oldAmount: number;
  newAmount: number;
}

export interface ReallocationPlan {
  oldSalary: number;
  newSalary: number;
  delta: number;
  changes: ReallocationChange[];
  newSavings: number;
  newReserve: number;
  newFreeMoney: number;
  uncovered: number;
}

/** Ensures "רזרבה חודשית" and "כסף פנוי" exist for this user. Safe to call repeatedly. */
export async function ensureSmartBudgetCategories() {
  const { supabase, user } = await requireUser();
  const { data: categories } = await supabase.from("categories").select("id, name").eq("user_id", user.id);
  const names = new Set((categories ?? []).map((c) => c.name));
  const toInsert: { name: string; icon: string; kind: string; color: string }[] = [];
  if (!names.has(RESERVE_NAME)) toInsert.push({ name: RESERVE_NAME, icon: RESERVE_ICON, kind: "savings", color: "#F2A65A" });
  if (!names.has(FREE_MONEY_NAME)) toInsert.push({ name: FREE_MONEY_NAME, icon: FREE_MONEY_ICON, kind: "expense", color: "#5AA9E6" });
  if (toInsert.length === 0) return;

  const { data: inserted, error } = await supabase
    .from("categories")
    .insert(toInsert.map((c) => ({ ...c, user_id: user.id, is_default: false })))
    .select("id, name");
  if (error) throw error;

  const defaults: Record<string, number> = { [RESERVE_NAME]: 500, [FREE_MONEY_NAME]: 0 };
  const budgetRows = (inserted ?? []).map((c) => ({ user_id: user.id, category_id: c.id, monthly_amount: defaults[c.name] ?? 0 }));
  if (budgetRows.length > 0) {
    await supabase.from("budgets").upsert(budgetRows, { onConflict: "user_id,category_id" });
  }
  revalidatePath("/settings");
}

async function getBudgetRows(): Promise<BudgetRow[]> {
  const { supabase } = await requireUser();
  const [{ data: categories, error: catErr }, { data: budgets, error: budErr }] = await Promise.all([
    supabase.from("categories").select("id, name, icon, kind").neq("kind", "income"),
    supabase.from("budgets").select("id, category_id, monthly_amount, locked"),
  ]);
  if (catErr) throw catErr;
  if (budErr) throw budErr;
  const budgetMap = new Map((budgets ?? []).map((b) => [b.category_id, b]));
  return (categories ?? []).map((c) => {
    const b = budgetMap.get(c.id);
    return {
      budgetId: b?.id ?? null,
      categoryId: c.id,
      categoryName: c.name,
      categoryIcon: c.icon,
      amount: Number(b?.monthly_amount ?? 0),
      locked: b?.locked ?? false,
    };
  });
}

/**
 * Computes a suggested budget reallocation for a salary change.
 *
 * Increase: tries Savings first, then Emergency Fund (skipped once its goal
 * target is reached), then the Monthly Reserve — each absorbs the full
 * increase in turn. A locked category is skipped entirely (money rolls to
 * the next priority). If all three are locked/maxed, the raise is split
 * evenly across remaining unlocked lifestyle categories, or as a last
 * resort added to כסף פנוי.
 *
 * Decrease: cuts כסף פנוי, then רזרבה חודשית, then Travel, Shopping,
 * Nightlife, Gifts, and finally Trading Accounts — skipping locked
 * categories and never touching Food, Fuel, or Health. If the full cut
 * can't be absorbed without touching essentials, the leftover is reported
 * as `uncovered` rather than silently touching a protected category.
 */
function computeReallocation(rows: BudgetRow[], oldSalary: number, newSalary: number, emergencyFundReached: boolean): ReallocationPlan {
  const delta = newSalary - oldSalary;
  const byName = new Map(rows.map((r) => [r.categoryName, r]));
  const changes = new Map<string, ReallocationChange>();

  function currentAmount(row: BudgetRow) {
    return changes.get(row.categoryId)?.newAmount ?? row.amount;
  }
  function applyChange(row: BudgetRow, newAmount: number) {
    changes.set(row.categoryId, {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
      oldAmount: row.amount,
      newAmount: Math.round(newAmount * 100) / 100,
    });
  }

  let remaining = Math.abs(delta);

  if (delta > 0) {
    for (const name of [SAVINGS_NAME, EMERGENCY_NAME, RESERVE_NAME]) {
      if (remaining <= 0) break;
      const row = byName.get(name);
      if (!row || row.locked) continue;
      if (name === EMERGENCY_NAME && emergencyFundReached) continue;
      applyChange(row, row.amount + remaining);
      remaining = 0;
    }
    if (remaining > 0) {
      const lifestyle = rows.filter((r) => !r.locked && !isEssential(r.categoryName) && !isSpecialCategory(r.categoryName));
      if (lifestyle.length > 0) {
        const share = remaining / lifestyle.length;
        lifestyle.forEach((r) => applyChange(r, r.amount + share));
        remaining = 0;
      } else {
        const fm = byName.get(FREE_MONEY_NAME);
        if (fm && !fm.locked) {
          applyChange(fm, fm.amount + remaining);
          remaining = 0;
        }
      }
    }
  } else if (delta < 0) {
    for (const key of DECREASE_ORDER) {
      if (remaining <= 0) break;
      const row = rows.find((r) => r.categoryName.includes(key));
      if (!row || row.locked) continue;
      const amt = currentAmount(row);
      const take = Math.min(remaining, amt);
      if (take <= 0) continue;
      applyChange(row, amt - take);
      remaining -= take;
    }
    if (remaining > 0) {
      const row = rows.find((r) => isTradingAccounts(r.categoryName));
      if (row && !row.locked) {
        const amt = currentAmount(row);
        const take = Math.min(remaining, amt);
        if (take > 0) {
          applyChange(row, amt - take);
          remaining -= take;
        }
      }
    }
  }

  const savingsRow = byName.get(SAVINGS_NAME);
  const reserveRow = byName.get(RESERVE_NAME);
  const freeMoneyRow = byName.get(FREE_MONEY_NAME);

  return {
    oldSalary,
    newSalary,
    delta,
    changes: Array.from(changes.values()),
    newSavings: savingsRow ? currentAmount(savingsRow) : 0,
    newReserve: reserveRow ? currentAmount(reserveRow) : 0,
    newFreeMoney: freeMoneyRow ? currentAmount(freeMoneyRow) : 0,
    uncovered: delta < 0 ? remaining : 0,
  };
}

export async function previewSalaryReallocation(newSalary: number): Promise<ReallocationPlan> {
  const { supabase } = await requireUser();
  const profile = await getOrCreateProfile();
  const [rows, { data: goals }] = await Promise.all([
    getBudgetRows(),
    supabase.from("goals").select("current_amount, target_amount").eq("name", EMERGENCY_NAME).limit(1),
  ]);
  const efGoal = goals?.[0];
  const emergencyFundReached = efGoal ? Number(efGoal.current_amount) >= Number(efGoal.target_amount) : false;
  return computeReallocation(rows, Number(profile.monthly_salary), newSalary, emergencyFundReached);
}

export async function applySalaryReallocation(newSalary: number, changes: ReallocationChange[]) {
  const { supabase, user } = await requireUser();
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ monthly_salary: newSalary, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileErr) throw profileErr;

  for (const c of changes) {
    const { error } = await supabase
      .from("budgets")
      .upsert({ user_id: user.id, category_id: c.categoryId, monthly_amount: c.newAmount }, { onConflict: "user_id,category_id" });
    if (error) throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/reports");
}

export interface FreeMoneyStatus {
  categoryId: string | null;
  budget: number;
  spent: number;
  remaining: number;
}

export async function getFreeMoneyStatus(month: string): Promise<FreeMoneyStatus> {
  const { supabase } = await requireUser();
  const rows = await getBudgetRows();
  const row = rows.find((r) => r.categoryName === FREE_MONEY_NAME);
  if (!row) return { categoryId: null, budget: 0, spent: 0, remaining: 0 };

  const [year, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${year}-${String(m).padStart(2, "0")}-${String(new Date(year, m, 0).getDate()).padStart(2, "0")}`;

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("category_id", row.categoryId)
    .eq("type", "expense")
    .gte("occurred_on", start)
    .lte("occurred_on", end);
  if (error) throw error;

  const spent = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
  return { categoryId: row.categoryId, budget: row.amount, spent, remaining: Math.max(row.amount - spent, 0) };
}

export async function transferFreeMoneyToSavings(month: string) {
  const { supabase, user } = await requireUser();
  const status = await getFreeMoneyStatus(month);
  if (status.remaining <= 0) return { transferred: 0 };

  const rows = await getBudgetRows();
  const savingsRow = rows.find((r) => r.categoryName === SAVINGS_NAME);
  if (!savingsRow) throw new Error("לא נמצאה קטגוריית חיסכון");

  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "savings",
    category_id: savingsRow.categoryId,
    amount: status.remaining,
    description: "העברת כסף פנוי לחיסכון",
    occurred_on: `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    note: "הועבר בעקבות הצעת המערכת בסוף החודש",
  });
  if (error) throw error;

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/settings");
  return { transferred: status.remaining };
}
