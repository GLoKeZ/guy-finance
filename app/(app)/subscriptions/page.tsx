"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from "@/lib/actions/subscriptions";
import { useRealtimeSync } from "@/lib/use-realtime-sync";
import { getCategories } from "@/lib/actions/categories";
import {
  getDueSubscriptionCharges,
  generateSubscriptionCharges,
  getActualSubscriptionCharges,
  type DueCharge,
} from "@/lib/actions/subscription-billing";
import { useMonth } from "@/lib/month-context";
import type { Subscription, Category, EssentialLevel } from "@/lib/types";
import { formatMoney, formatDate, monthLabel } from "@/lib/utils";
import { sumBy } from "@/lib/finance-calc";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(1, "שדה חובה"),
  category_id: z.string().min(1, "שדה חובה"),
  amount: z.coerce.number().positive("יש להזין סכום תקין"),
  billing_day: z.coerce.number().min(1).max(31),
  essential_level: z.enum(["essential", "non_essential", "review"]),
  auto_charge_enabled: z.boolean(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const LEVEL_LABEL: Record<string, string> = { essential: "חיוני", non_essential: "לא חיוני", review: "לבדיקה" };

export default function SubscriptionsPage() {
  const { month } = useMonth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [actualCharges, setActualCharges] = useState<Awaited<ReturnType<typeof getActualSubscriptionCharges>>>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCharges, setPreviewCharges] = useState<DueCharge[]>([]);
  const [checkingDue, setCheckingDue] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, c, actual] = await Promise.all([
      getSubscriptions(),
      getCategories(),
      getActualSubscriptionCharges(month),
    ]);
    setSubs(s);
    setCategories(c);
    setActualCharges(actual);
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useRealtimeSync("subscriptions", load);
  useRealtimeSync("transactions", load);

  const active = subs.filter((s) => s.active);
  const monthlyTotal = sumBy(active, (s) => s.amount);
  const nonEssential = sumBy(active.filter((s) => s.essential_level === "non_essential"), (s) => s.amount);
  const actualTotal = sumBy(actualCharges, (t) => Number(t.amount));

  async function toggleActive(s: Subscription) {
    await updateSubscription(s.id, { active: !s.active });
    load();
  }

  async function toggleAutoCharge(s: Subscription) {
    await updateSubscription(s.id, { auto_charge_enabled: !s.auto_charge_enabled });
    load();
  }

  async function handleDelete(id: string) {
    await deleteSubscription(id);
    toast.success("נמחק");
    load();
  }

  async function handleCheckDue() {
    setCheckingDue(true);
    try {
      const due = await getDueSubscriptionCharges(month);
      if (due.length === 0) {
        toast.info("אין חיובים ממתינים ליצירה החודש");
        return;
      }
      setPreviewCharges(due);
      setPreviewOpen(true);
    } finally {
      setCheckingDue(false);
    }
  }

  async function handleConfirmGenerate() {
    setGenerating(true);
    try {
      const result = await generateSubscriptionCharges(month);
      toast.success(`נוצרו ${result.created} עסקאות`);
      setPreviewOpen(false);
      load();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="מנויים"
        subtitle="כל החיוב החוזר במקום אחד"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCheckDue} disabled={checkingDue} className="gap-2">
              {checkingDue ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              צור חיובים שהגיע זמנם
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> הוספה</Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">עלות מנויים צפויה</div><div className="mt-1 font-tabular text-lg font-bold text-accent">{formatMoney(monthlyTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">חיובים שנרשמו בפועל ({monthLabel(month)})</div><div className="mt-1 font-tabular text-lg font-bold text-primary">{formatMoney(actualTotal)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">מנויים פעילים</div><div className="mt-1 font-tabular text-lg font-bold">{active.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">לא חיוני</div><div className="mt-1 font-tabular text-lg font-bold text-warning">{formatMoney(nonEssential)}</div></CardContent></Card>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : subs.length === 0 ? (
        <EmptyState icon="🔁" title="אין מנויים עדיין" />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {subs.map((s) => {
              const wasCharged = actualCharges.some((t) => t.subscription_id === s.id);
              return (
                <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: s.active ? 1 : 0.5 }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-base">{s.category?.icon ?? "🔁"}</div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {s.name}
                        {wasCharged && <Badge variant="default" className="text-[9px]">נרשם החודש</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{s.category?.name} · חיוב ביום {s.billing_day}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={s.essential_level === "essential" ? "default" : s.essential_level === "non_essential" ? "destructive" : "warning"}>
                      {LEVEL_LABEL[s.essential_level]}
                    </Badge>
                    <span className="font-tabular text-sm font-semibold">{formatMoney(s.amount)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">רישום אוטומטי</span>
                      <Switch checked={s.auto_charge_enabled} onCheckedChange={() => toggleAutoCharge(s)} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">פעיל</span>
                      <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                    </div>
                    <button onClick={() => { setEditing(s); setFormOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <SubscriptionForm open={formOpen} onOpenChange={setFormOpen} categories={categories} editing={editing} onSaved={load} />

      {/* Preview confirmation before generating charges */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
          <SheetHeader><SheetTitle>אישור יצירת חיובים — {monthLabel(month)}</SheetTitle></SheetHeader>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-muted-foreground">הפעולות הבאות ייווצרו כעסקאות הוצאה:</p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {previewCharges.map((c) => (
                <div key={c.subscriptionId} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{c.categoryIcon}</span>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDate(c.occurredOn)} · {c.categoryName ?? "ללא קטגוריה"}</div>
                    </div>
                  </div>
                  <span className="font-tabular font-semibold">{formatMoney(c.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>סהֲכ</span>
              <span className="font-tabular">{formatMoney(sumBy(previewCharges, (c) => c.amount))}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 gap-2" onClick={handleConfirmGenerate} disabled={generating}>
                {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                אישור ויצירה
              </Button>
              <Button variant="ghost" onClick={() => setPreviewOpen(false)}>ביטול</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SubscriptionForm({ open, onOpenChange, categories, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; categories: Category[]; editing: Subscription | null; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? { name: editing.name, category_id: editing.category_id ?? "", amount: editing.amount, billing_day: editing.billing_day, essential_level: editing.essential_level, auto_charge_enabled: editing.auto_charge_enabled, note: editing.note ?? "" }
      : { name: "", category_id: "", amount: 0, billing_day: 1, essential_level: "review" as EssentialLevel, auto_charge_enabled: true, note: "" },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      if (editing) await updateSubscription(editing.id, values);
      else await createSubscription(values);
      toast.success(editing ? "עודכן" : "המנוי נוסף");
      reset();
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "נכשל");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
        <SheetHeader><SheetTitle>{editing ? "עריכת מנוי" : "הוספת מנוי"}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div className="space-y-1.5"><Label>שם</Label><Input {...register("name")} placeholder="Netflix, Bookmap..." />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
          <div className="space-y-1.5">
            <Label>קטגוריה</Label>
            <Controller control={control} name="category_id" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>עלות חודשית</Label><Input type="number" step="0.01" {...register("amount")} /></div>
            <div className="space-y-1.5"><Label>יום חיוב</Label><Input type="number" min={1} max={31} {...register("billing_day")} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>סטטוס</Label>
            <Controller control={control} name="essential_level" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">חיוני</SelectItem>
                  <SelectItem value="non_essential">לא חיוני</SelectItem>
                  <SelectItem value="review">לבדיקה</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>רישום אוטומטי כהוצאה</Label>
              <p className="text-[11px] text-muted-foreground">ייצור עסקת הוצאה אוטומטית ביום החיוב מדי חודש</p>
            </div>
            <Controller control={control} name="auto_charge_enabled" render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
          <div className="space-y-1.5"><Label>הערה</Label><Input {...register("note")} /></div>
          <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
