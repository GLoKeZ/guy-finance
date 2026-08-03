"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { Budget } from "@/lib/types";

export async function getBudgets(): Promise<Budget[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("budgets").select("*");
  if (error) throw error;
  return data as Budget[];
}

export async function setBudget(categoryId: string, monthlyAmount: number) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("budgets")
    .upsert({ user_id: user.id, category_id: categoryId, monthly_amount: monthlyAmount }, { onConflict: "user_id,category_id" });
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function setBudgetLock(categoryId: string, locked: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("budgets")
    .upsert({ user_id: user.id, category_id: categoryId, locked }, { onConflict: "user_id,category_id" });
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
