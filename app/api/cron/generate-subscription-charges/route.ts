import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/**
 * Runs daily (see vercel.json). For every active subscription with
 * auto-charge enabled whose billing day has arrived this month, creates
 * one expense transaction — across ALL users, since this is a background
 * job with no signed-in user. Idempotent: skips subscriptions that already
 * have a transaction for this exact (subscription, year, month).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const lastDay = daysInMonth(year, month);

  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, name, amount, category_id, billing_day")
    .eq("active", true)
    .eq("auto_charge_enabled", true)
    .lte("billing_day", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) return NextResponse.json({ created: 0 });

  const { data: existing } = await supabase
    .from("transactions")
    .select("subscription_id")
    .eq("billing_year", year)
    .eq("billing_month", month)
    .not("subscription_id", "is", null);
  const existingSet = new Set((existing ?? []).map((t) => t.subscription_id as string));

  const rows = subs
    .filter((s) => !existingSet.has(s.id))
    .map((s) => {
      const day = Math.min(s.billing_day, lastDay);
      return {
        user_id: s.user_id,
        type: "expense" as const,
        amount: s.amount,
        category_id: s.category_id,
        description: s.name,
        occurred_on: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        is_recurring: true,
        subscription_id: s.id,
        billing_year: year,
        billing_month: month,
        note: "נוצר אוטומטית ממנוי",
      };
    });

  if (rows.length === 0) return NextResponse.json({ created: 0 });

  const { error: insertErr } = await supabase.from("transactions").insert(rows);
  if (insertErr && (insertErr as { code?: string }).code !== "23505") {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ created: rows.length });
}
