"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { EssentialLevel, Subscription } from "@/lib/types";

export async function getSubscriptions(): Promise<Subscription[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, category:categories(*)")
    .order("active", { ascending: false })
    .order("name");
  if (error) throw error;
  return data as unknown as Subscription[];
}

export interface SubscriptionInput {
  name: string;
  category_id: string | null;
  amount: number;
  billing_day: number;
  essential_level: EssentialLevel;
  note?: string | null;
  active?: boolean;
}

export async function createSubscription(input: SubscriptionInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("subscriptions").insert({ ...input, user_id: user.id, active: input.active ?? true });
  if (error) throw error;
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function updateSubscription(id: string, patch: Partial<SubscriptionInput>) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("subscriptions").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function deleteSubscription(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/subscriptions");
}
