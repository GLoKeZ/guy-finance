"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  foot,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: string;
  foot?: string;
  tone?: "default" | "primary" | "destructive" | "warning" | "accent";
  delay?: number;
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    destructive: "text-destructive",
    warning: "text-warning",
    accent: "text-accent",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <Card className="p-4">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={cn("mt-1 font-tabular text-xl font-bold", toneClass)}>{value}</div>
        {foot && <div className="mt-1 font-tabular text-[11px] text-muted-foreground">{foot}</div>}
      </Card>
    </motion.div>
  );
}
