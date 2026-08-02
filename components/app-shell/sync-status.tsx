"use client";
import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Simple online/offline indicator. Since writes go through Next.js Server
 * Actions (which require a live connection), there is currently no offline
 * write queue — this reflects connectivity only, not "pending changes".
 */
export function SyncStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div
      className={cn(
        "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:flex",
        online ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      )}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? "מסונכרן" : "אין חיבור"}
    </div>
  );
}
