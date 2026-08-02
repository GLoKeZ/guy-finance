"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { Investment, InvestmentKind } from "@/lib/types";

export async function getInvestments(): Promise<Investment[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("investments").select("*").order("purchase_date", { ascending: false });
  if (error) throw error;
  return data as Investment[];
}

export interface InvestmentInput {
  name: string;
  kind: InvestmentKind;
  amount_invested: number;
  current_value: number;
  purchase_date: string;
  note?: string | null;
}

export async function createInvestment(input: InvestmentInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("investments").insert({ ...input, user_id: user.id });
  if (error) throw error;
  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

export async function updateInvestment(id: string, patch: Partial<InvestmentInput>) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("investments").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/investments");
}

export async function deleteInvestment(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/investments");
}
