"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { TradingAccount, TradingPayout, TradingStatus } from "@/lib/types";

export async function getTradingAccounts(): Promise<TradingAccount[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("trading_accounts").select("*").order("purchase_date", { ascending: false });
  if (error) throw error;
  return data as TradingAccount[];
}

export async function getTradingPayouts(): Promise<TradingPayout[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("trading_payouts").select("*").order("paid_on", { ascending: false });
  if (error) throw error;
  return data as TradingPayout[];
}

export interface TradingAccountInput {
  provider: string;
  account_size?: number | null;
  cost: number;
  purchase_date: string;
  status: TradingStatus;
  note?: string | null;
}

export async function createTradingAccount(input: TradingAccountInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("trading_accounts").insert({ ...input, user_id: user.id });
  if (error) throw error;
  revalidatePath("/trading");
  revalidatePath("/dashboard");
}

export async function deleteTradingAccount(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("trading_accounts").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/trading");
}

export interface TradingPayoutInput {
  trading_account_id?: string | null;
  provider: string;
  amount: number;
  paid_on: string;
  note?: string | null;
}

export async function createTradingPayout(input: TradingPayoutInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("trading_payouts").insert({ ...input, user_id: user.id });
  if (error) throw error;
  revalidatePath("/trading");
  revalidatePath("/dashboard");
}

export async function deleteTradingPayout(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("trading_payouts").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/trading");
}
