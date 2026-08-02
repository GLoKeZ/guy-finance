"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { Transaction, TxType } from "@/lib/types";

export interface TransactionFilters {
  month?: string; // "YYYY-MM"
  type?: TxType;
  categoryId?: string;
  search?: string;
  limit?: number;
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const { supabase } = await requireUser();
  let query = supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number);
    const start = `${filters.month}-01`;
    const endDate = new Date(y, m, 0).getDate();
    const end = `${filters.month}-${String(endDate).padStart(2, "0")}`;
    query = query.gte("occurred_on", start).lte("occurred_on", end);
  }
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.search) query = query.or(`description.ilike.%${filters.search}%,merchant.ilike.%${filters.search}%,note.ilike.%${filters.search}%`);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Transaction[];
}

export interface TransactionInput {
  type: TxType;
  amount: number;
  category_id: string | null;
  description: string;
  merchant?: string | null;
  payment_method?: string | null;
  occurred_on: string;
  note?: string | null;
}

export async function createTransaction(input: TransactionInput) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...input, user_id: user.id })
    .select("*, category:categories(*)")
    .single();
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return data as unknown as Transaction;
}

export async function updateTransaction(id: string, patch: Partial<TransactionInput>) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("transactions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

/** All months (YYYY-MM) that have at least one transaction, newest first. */
export async function getAvailableMonths(): Promise<string[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("transactions").select("occurred_on");
  if (error) throw error;
  const set = new Set<string>();
  const now = new Date();
  set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  (data ?? []).forEach((t: { occurred_on: string }) => {
    set.add(t.occurred_on.slice(0, 7));
  });
  return Array.from(set).sort().reverse();
}
