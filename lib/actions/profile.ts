"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "./helpers";
import type { Profile } from "@/lib/types";

export async function getOrCreateProfile(): Promise<Profile> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, full_name: user.user_metadata?.full_name ?? null, avatar_url: user.user_metadata?.avatar_url ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return created as Profile;
}

export async function updateProfile(patch: Partial<Profile>) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}
