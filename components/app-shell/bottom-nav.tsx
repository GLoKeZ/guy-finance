"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

// Most-used items get a fixed slot; the rest are reachable via horizontal scroll.
const PRIMARY_ITEMS = NAV_ITEMS.slice(0, 5);
const MORE_ITEMS = NAV_ITEMS.slice(5);

export function BottomNav() {
  const pathname = usePathname();
  const allItems = [...PRIMARY_ITEMS, ...MORE_ITEMS];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 backdrop-blur-lg md:hidden">
      <div className="no-scrollbar flex items-stretch overflow-x-auto px-1 pb-[env(safe-area-inset-bottom)]">
        {allItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex min-w-[64px] flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium"
            >
              {active && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("whitespace-nowrap", active ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
