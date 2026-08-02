"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { Goal } from "@/lib/types";

export async function getGoals(): Promise<Goal[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("goals").select("*").order("created_at");
  if (error) throw error;
  return data as Goal[];
}

export interface GoalInput {
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  target_date?: string | null;
}

export async function createGoal(input: GoalInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("goals").insert({ ...input, user_id: user.id });
  if (error) throw error;
  revalidatePath("/savings");
  revalidatePath("/dashboard");
}

export async function updateGoal(id: string, patch: Partial<GoalInput>) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/savings");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/savings");
}
