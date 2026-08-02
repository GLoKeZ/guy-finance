"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useMonth } from "@/lib/month-context";
import { getTransactions } from "@/lib/actions/transactions";
import { getSubscriptions } from "@/lib/actions/subscriptions";
import { getOrCreateProfile } from "@/lib/actions/profile";
import { generateInsights } from "@/lib/insights";
import type { Transaction, Subscription, Profile } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsPage() {
  const { month } = useMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [txs, subs, p] = await Promise.all([getTransactions({ limit: 3000 }), getSubscriptions(), getOrCreateProfile()]);
    setTransactions(txs);
    setSubscriptions(subs);
    setProfile(p);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const insights = generateInsights(transactions, subscriptions, profile, month);

  const toneClass: Record<string, string> = {
    good: "border-primary/30 bg-primary/5",
    warn: "border-warning/30 bg-warning/5",
    info: "border-accent/30 bg-accent/5",
  };

  return (
    <div>
      <PageHeader title="תובנות AI" subtitle="תובנות אישיות שמחושבות ישירות מהנתונים שלך" />
      <div className="space-y-2.5">
        {insights.map((ins, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={toneClass[ins.tone]}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className="text-xl leading-none">{ins.icon}</span>
                <p className="text-sm leading-relaxed">{ins.text}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
