"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, LogOut, Plus, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateProfile, updateProfile } from "@/lib/actions/profile";
import { getCategories } from "@/lib/actions/categories";
import { getBudgets, setBudget } from "@/lib/actions/budgets";
import { getTransactions } from "@/lib/actions/transactions";
import { getRecurringPayments, createRecurringPayment, deleteRecurringPayment } from "@/lib/actions/recurring";
import type { Profile, Category, Budget, RecurringPayment } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, c, b, r] = await Promise.all([getOrCreateProfile(), getCategories(), getBudgets(), getRecurringPayments()]);
    setProfile(p);
    setCategories(c);
    setBudgets(b);
    setRecurring(r);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSaveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile({
        full_name: profile.full_name,
        currency: profile.currency,
        monthly_salary: profile.monthly_salary,
        salary_day: profile.salary_day,
        monthly_savings_target: profile.monthly_savings_target,
        investment_target: profile.investment_target,
        max_spending: profile.max_spending,
        emergency_fund_target: profile.emergency_fund_target,
      });
      toast.success("הפרופיל עודכן");
    } finally {
      setSaving(false);
    }
  }

  async function handleBudgetChange(categoryId: string, value: number) {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.category_id === categoryId);
      if (existing) return prev.map((b) => (b.category_id === categoryId ? { ...b, monthly_amount: value } : b));
      return [...prev, { id: crypto.randomUUID(), user_id: "", category_id: categoryId, monthly_amount: value, created_at: "" }];
    });
  }

  async function handleSaveBudgets() {
    setSaving(true);
    try {
      await Promise.all(budgets.map((b) => setBudget(b.category_id, b.monthly_amount)));
      toast.success("התקציב נשמר");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportCsv() {
    const txs = await getTransactions({ limit: 5000 });
    const headers = ["תאריך", "סוג", "תיאור", "קטגוריה", "סכום", "מטבע", "אמצעי תשלום", "הערה"];
    const rows = txs.map((t) => [t.occurred_on, t.type, t.description, t.category?.name ?? "", t.amount, t.currency, t.payment_method ?? "", t.note ?? ""]);
    const csv = [headers, ...rows].map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `עסקאות-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("יוצא בהצלחה");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="הגדרות" subtitle="הפרופיל, היעדים והנתונים שלך" />

      <Card>
        <CardHeader><CardTitle>פרופיל</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>שם מלא</Label><Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>מטבע</Label>
              <Select value={profile.currency} onValueChange={(v) => setProfile({ ...profile, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">שקל (₪)</SelectItem>
                  <SelectItem value="USD">דולר ($)</SelectItem>
                  <SelectItem value="EUR">יורו (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>משכורת חודשית</Label><Input type="number" value={profile.monthly_salary} onChange={(e) => setProfile({ ...profile, monthly_salary: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>יום קבלת משכורת</Label><Input type="number" min={1} max={31} value={profile.salary_day} onChange={(e) => setProfile({ ...profile, salary_day: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור פרופיל</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>יעדים אישיים</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>יעד חיסכון חודשי</Label><Input type="number" value={profile.monthly_savings_target} onChange={(e) => setProfile({ ...profile, monthly_savings_target: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>יעד השקעה</Label><Input type="number" value={profile.investment_target} onChange={(e) => setProfile({ ...profile, investment_target: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>תקרת הוצאות חודשית</Label><Input type="number" value={profile.max_spending} onChange={(e) => setProfile({ ...profile, max_spending: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>יעד קרן חירום</Label><Input type="number" value={profile.emergency_fund_target} onChange={(e) => setProfile({ ...profile, emergency_fund_target: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור יעדים</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>תקציב חודשי לפי קטגוריה</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {categories.filter((c) => c.kind !== "income").map((c) => {
            const b = budgets.find((b) => b.category_id === c.id);
            return (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <span className="text-sm">{c.icon} {c.name}</span>
                <Input type="number" className="w-28" value={b?.monthly_amount ?? 0} onChange={(e) => handleBudgetChange(c.id, Number(e.target.value))} />
              </div>
            );
          })}
          <Button onClick={handleSaveBudgets} disabled={saving} className="mt-2 gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור תקציב</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>הוראות קבע</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recurring.length === 0 && <p className="text-sm text-muted-foreground">אין הוראות קבע מוגדרות.</p>}
          {recurring.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
              <span className="text-sm">{r.name} · {r.frequency === "monthly" ? "חודשי" : r.frequency === "weekly" ? "שבועי" : "שנתי"}</span>
              <div className="flex items-center gap-2">
                <span className="font-tabular text-sm">{r.amount}</span>
                <button onClick={async () => { await deleteRecurringPayment(r.id); load(); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          <RecurringForm categories={categories} onAdded={load} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>נתונים</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCsv} className="gap-2"><Download className="h-4 w-4" /> ייצוא ל-CSV</Button>
          <Button variant="destructive" onClick={handleSignOut} className="gap-2"><LogOut className="h-4 w-4" /> התנתקות</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RecurringForm({ categories, onAdded }: { categories: Category[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name || !categoryId) { toast.error("יש למלא שם וקטגוריה"); return; }
    setSaving(true);
    try {
      await createRecurringPayment({ name, amount, frequency, category_id: categoryId, next_due_date: new Date().toISOString().slice(0, 10) });
      setName(""); setAmount(0); setOpen(false);
      onAdded();
      toast.success("נוסף בהצלחה");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> הוספת הוראת קבע</Button>;

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="שם" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="number" placeholder="סכום" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue placeholder="קטגוריה" /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">שבועי</SelectItem>
            <SelectItem value="monthly">חודשי</SelectItem>
            <SelectItem value="yearly">שנתי</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={saving} className="gap-1.5">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}שמור</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>ביטול</Button>
      </div>
    </div>
  );
}
