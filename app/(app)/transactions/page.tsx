"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { useMonth } from "@/lib/month-context";
import { useRealtimeSync } from "@/lib/use-realtime-sync";
import { getCategories } from "@/lib/actions/categories";
import { getTransactions } from "@/lib/actions/transactions";
import type { Category, Transaction, TxType } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionList, TransactionListSkeleton } from "@/components/transactions/transaction-list";
import { monthLabel } from "@/lib/utils";

export default function TransactionsPage() {
  const { month } = useMonth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TxType | "all">("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [allTime, setAllTime] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransactions({
        month: allTime ? undefined : month,
        type: type === "all" ? undefined : type,
        categoryId: categoryId === "all" ? undefined : categoryId,
        search: search || undefined,
      });
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }, [month, type, categoryId, search, allTime]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeSync("transactions", load);

  return (
    <div>
      <PageHeader
        title="עסקאות"
        subtitle={allTime ? "כל הזמנים" : monthLabel(month)}
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> הוספה
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי בית עסק או הערה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={type} onValueChange={(v) => setType(v as TxType | "all")}>
            <TabsList>
              <TabsTrigger value="all">הכל</TabsTrigger>
              <TabsTrigger value="expense">הוצאה</TabsTrigger>
              <TabsTrigger value="income">הכנסה</TabsTrigger>
              <TabsTrigger value="savings">חיסכון</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-[170px] text-xs">
              <SelectValue placeholder="קטגוריה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant={allTime ? "default" : "outline"} size="sm" onClick={() => setAllTime((v) => !v)}>
            {allTime ? "כל הזמנים" : "החודש"}
          </Button>
        </div>
      </div>

      {loading ? <TransactionListSkeleton /> : (
        <TransactionList
          transactions={transactions}
          onEdit={(t) => { setEditing(t); setFormOpen(true); }}
          onChanged={load}
        />
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}
