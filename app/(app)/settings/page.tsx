"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, LogOut, Plus, Trash2, Loader2, Lock, LockOpen, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateProfile, updateProfile } from "@/lib/actions/profile";
import { getCategories } from "@/lib/actions/categories";
import { getBudgets, setBudget, setBudgetLock } from "@/lib/actions/budgets";
import {
  ensureSmartBudgetCategories,
  previewSalaryReallocation,
  applySalaryReallocation,
  getFreeMoneyStatus,
  transferFreeMoneyToSavings,
  type ReallocationPlan,
  type FreeMoneyStatus,
} from "@/lib/actions/smart-budget";
import { FREE_MONEY_NAME } from "@/lib/smart-budget-constants";
import { useRealtimeSync } from "@/lib/use-realtime-sync";
import { useMonth } from "@/lib/month-context";
import { getTransactions } from "@/lib/actions/transactions";
import { getRecurringPayments, createRecurringPayment, deleteRecurringPayment } from "@/lib/actions/recurring";
import type { Profile, Category, Budget, RecurringPayment } from "@/lib/types";
import { formatMoney, monthLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { month } = useMonth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [originalSalary, setOriginalSalary] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [freeMoney, setFreeMoney] = useState<FreeMoneyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reallocPreview, setReallocPreview] = useState<ReallocationPlan | null>(null);
  const [reallocOpen, setReallocOpen] = useState(false);
  const [applyingRealloc, setApplyingRealloc] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await ensureSmartBudgetCategories();
    const [p, c, b, r, fm] = await Promise.all([
      getOrCreateProfile(),
      getCategories(),
      getBudgets(),
      getRecurringPayments(),
      getFreeMoneyStatus(month),
    ]);
    setProfile(p);
    setOriginalSalary((prev) => (prev === null ? Number(p.monthly_salary) : prev));
    setCategories(c);
    setBudgets(b);
    setRecurring(r);
    setFreeMoney(fm);
    setLoading(false);
  }, [month]);
  useEffect(() => { load(); }, [load]);
  useRealtimeSync("budgets", load);

  async function handleSaveProfile() {
    if (!profile) return;
    const salaryChanged = originalSalary !== null && Number(profile.monthly_salary) !== originalSalary;

    if (salaryChanged) {
      const plan = await previewSalaryReallocation(Number(profile.monthly_salary));
      setReallocPreview(plan);
      setReallocOpen(true);
      return;
    }

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

  async function handleApplySuggestedBudget() {
    if (!reallocPreview) return;
    setApplyingRealloc(true);
    try {
      await applySalaryReallocation(reallocPreview.newSalary, reallocPreview.changes);
      toast.success("המשכורת והתקציב עודכנו לפי ההצעה");
      setReallocOpen(false);
      setOriginalSalary(reallocPreview.newSalary);
      load();
    } finally {
      setApplyingRealloc(false);
    }
  }

  async function handleKeepOrEditManually() {
    if (!reallocPreview) return;
    setApplyingRealloc(true);
    try {
      await updateProfile({ monthly_salary: reallocPreview.newSalary });
      toast.success("המשכורת עודכנה — התקציב נשאר כפי שהיה");
      setReallocOpen(false);
      setOriginalSalary(reallocPreview.newSalary);
      load();
    } finally {
      setApplyingRealloc(false);
    }
  }

  async function handleBudgetChange(categoryId: string, value: number) {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.category_id === categoryId);
      if (existing) return prev.map((b) => (b.category_id === categoryId ? { ...b, monthly_amount: value } : b));
      return [...prev, { id: crypto.randomUUID(), user_id: "", category_id: categoryId, monthly_amount: value, locked: false, created_at: "" }];
    });
  }

  async function toggleLock(categoryId: string, locked: boolean) {
    setBudgets((prev) => prev.map((b) => (b.category_id === categoryId ? { ...b, locked } : b)));
    await setBudgetLock(categoryId, locked);
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

  async function handleConfirmTransfer() {
    setTransferring(true);
    try {
      const result = await transferFreeMoneyToSavings(month);
      if (result.transferred > 0) toast.success(`${formatMoney(result.transferred)} הועברו לחיסכון`);
      setTransferOpen(false);
      load();
    } finally {
      setTransferring(false);
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

      {freeMoney && freeMoney.categoryId && (
        <Card className={freeMoney.remaining > 0 ? "border-accent/40 bg-accent/5" : undefined}>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" /> כסף פנוי — {monthLabel(month)}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">תקציב: {formatMoney(freeMoney.budget)} · נוצל: {formatMoney(freeMoney.spent)}</span>
              <span className="font-tabular font-semibold text-accent">נותר: {formatMoney(freeMoney.remaining)}</span>
            </div>
            {freeMoney.remaining > 0 && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">העבר את הכסף הפנוי לחיסכון?</p>
                <Button size="sm" onClick={() => setTransferOpen(true)}>העבר לחיסכון</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>תקציב חודשי לפי קטגוריה</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {categories.filter((c) => c.kind !== "income").map((c) => {
            const b = budgets.find((b) => b.category_id === c.id);
            const locked = b?.locked ?? false;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <button
                  onClick={() => toggleLock(c.id, !locked)}
                  title={locked ? "נעול — לא ישתנה אוטומטית" : "פתוח — יכול להשתנות אוטומטית"}
                  className={locked ? "text-warning" : "text-muted-foreground hover:text-foreground"}
                >
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                </button>
                <span className="flex-1 text-sm">{c.icon} {c.name}</span>
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

      {/* Smart salary reallocation preview */}
      <Sheet open={reallocOpen} onOpenChange={setReallocOpen}>
        <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
          <SheetHeader><SheetTitle>עדכון משכורת — הצעת תקציב חכמה</SheetTitle></SheetHeader>
          {reallocPreview && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span className="text-muted-foreground">משכורת קודמת</span>
                <span className="font-tabular font-semibold">{formatMoney(reallocPreview.oldSalary)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span className="text-muted-foreground">משכורת חדשה</span>
                <span className={`font-tabular font-semibold ${reallocPreview.delta >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatMoney(reallocPreview.newSalary)} ({reallocPreview.delta >= 0 ? "+" : ""}{formatMoney(reallocPreview.delta)})
                </span>
              </div>

              {reallocPreview.changes.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">קטגוריות שישתנו:</p>
                  <div className="space-y-1.5">
                    {reallocPreview.changes.map((c) => (
                      <div key={c.categoryId} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                        <span>{c.categoryIcon} {c.categoryName}</span>
                        <span className="font-tabular">
                          {formatMoney(c.oldAmount)} ← <span className={c.newAmount >= c.oldAmount ? "text-primary" : "text-destructive"}>{formatMoney(c.newAmount)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">כל הקטגוריות הרלוונטיות נעולות — לא בוצע שינוי אוטומטי.</p>
              )}

              {reallocPreview.uncovered > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  לא ניתן היה לכסות את כל הקיצוץ מבלי לפגוע בקטגוריות חיוניות (אוכל, דלק, בריאות). נותרו {formatMoney(reallocPreview.uncovered)} שלא כוסו.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 border-t border-border pt-2 text-sm">
                <div><span className="text-muted-foreground">חיסכון חדש: </span><span className="font-tabular font-semibold">{formatMoney(reallocPreview.newSavings)}</span></div>
                <div><span className="text-muted-foreground">רזרבה חדשה: </span><span className="font-tabular font-semibold">{formatMoney(reallocPreview.newReserve)}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">כסף פנוי שנותר: </span><span className="font-tabular font-semibold text-accent">{formatMoney(reallocPreview.newFreeMoney)}</span></div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleApplySuggestedBudget} disabled={applyingRealloc} className="gap-2">
                  {applyingRealloc && <Loader2 className="h-4 w-4 animate-spin" />}
                  החל את התקציב המוצע
                </Button>
                <Button variant="outline" onClick={handleKeepOrEditManually} disabled={applyingRealloc}>ערוך ידנית בעצמי</Button>
                <Button variant="ghost" onClick={handleKeepOrEditManually} disabled={applyingRealloc}>השאר את התקציב הקיים</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Free money -> savings transfer confirmation */}
      <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
        <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
          <SheetHeader><SheetTitle>העברת כסף פנוי לחיסכון</SheetTitle></SheetHeader>
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              נותרו {formatMoney(freeMoney?.remaining ?? 0)} מתוך תקציב "{FREE_MONEY_NAME}" שלא נוצלו החודש. פעולה זו תרשום עסקת חיסכון בסכום זה.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={handleConfirmTransfer} disabled={transferring}>
                {transferring && <Loader2 className="h-4 w-4 animate-spin" />}
                אישור העברה
              </Button>
              <Button variant="ghost" onClick={() => setTransferOpen(false)}>ביטול</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
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
