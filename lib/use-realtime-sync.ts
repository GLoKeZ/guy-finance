"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes on `table` scoped to the current user and
 * calls `onChange` whenever a row is inserted/updated/deleted by ANY client
 * (this browser tab, another tab, another device). This is what makes an
 * edit on the phone show up on the computer without a manual refresh.
 */
export function useRealtimeSync(table: string, onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase
        .channel(`sync:${table}:${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `user_id=eq.${data.user.id}` },
          () => onChange()
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}
