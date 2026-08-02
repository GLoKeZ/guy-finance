"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Transaction } from "@/lib/types";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatDate, formatMoney } from "@/lib/utils";
import { EmptyState } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function TransactionList({
  transactions,
  onEdit,
  onChanged,
}: {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onChanged: () => void;
}) {
  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id);
      toast.success("נמחק");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "המחיקה נכשלה");
    }
  }

  if (!transactions.length) {
    return <EmptyState icon="🔍" title="לא נמצאו עסקאות" />;
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {transactions.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-base">
                {t.category?.icon ?? "📎"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.description}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {formatDate(t.occurred_on)} · {t.category?.name ?? "ללא קטגוריה"} · {t.payment_method}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`font-tabular text-sm font-semibold ${
                  t.type === "income" ? "text-primary" : t.type === "savings" ? "text-accent" : "text-destructive"
                }`}
              >
                {t.type === "expense" ? "-" : "+"}
                {formatMoney(t.amount, t.currency)}
              </span>
              <button onClick={() => onEdit(t)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
