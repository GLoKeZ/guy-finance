import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORIES } from "@/lib/types";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** Seeds the default category set for a user the first time they have none. */
export async function ensureDefaultCategories() {
  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count) {
    await supabase.from("categories").insert(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id, is_default: true }))
    );
  }
  return { supabase, user };
}
