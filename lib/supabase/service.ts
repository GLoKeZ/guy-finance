import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — server-only, never imported into client components.
 * Used exclusively by the daily cron route, which must operate across all
 * users' subscriptions (a normal RLS-scoped client only sees one user).
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
