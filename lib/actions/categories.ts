"use server";
import { revalidatePath } from "next/cache";
import { ensureDefaultCategories, requireUser } from "./helpers";
import type { Category, CategoryKind } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  const { supabase } = await ensureDefaultCategories();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("kind")
    .order("name");
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(input: { name: string; icon: string; color: string; kind: CategoryKind }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("categories").insert({ ...input, user_id: user.id });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function deleteCategory(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}
