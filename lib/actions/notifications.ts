"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { AppNotification } from "@/lib/types";

export async function getNotifications(): Promise<AppNotification[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as AppNotification[];
}

export async function markNotificationRead(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function createNotification(input: { type: string; title: string; body?: string }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("notifications").insert({ ...input, user_id: user.id });
  if (error) throw error;
  revalidatePath("/", "layout");
}
