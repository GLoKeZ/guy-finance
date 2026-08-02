"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { Frequency, RecurringPayment } from "@/lib/types";

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("recurring_payments").select("*").order("next_due_date");
  if (error) throw error;
  return data as RecurringPayment[];
}

export interface RecurringPaymentInput {
  name: string;
  category_id: string | null;
  amount: number;
  frequency: Frequency;
  next_due_date: string;
  active?: boolean;
}

export async function createRecurringPayment(input: RecurringPaymentInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("recurring_payments").insert({ ...input, user_id: user.id, active: input.active ?? true });
  if (error) throw error;
  revalidatePath("/settings");
}

export async function deleteRecurringPayment(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recurring_payments").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
}
