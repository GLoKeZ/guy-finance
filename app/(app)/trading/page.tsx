"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getTradingAccounts, getTradingPayouts, createTradingAccount, createTradingPayout,
  deleteTradingAccount, deleteTradingPayout,
} from "@/lib/actions/trading";
import type { TradingAccount, TradingPayout, TradingStatus } from "@/lib/types";
import { formatDate, formatMoney, formatPercent } from "@/lib/utils";
import { sumBy } from "@/lib/finance-calc";
import { useMonth } from "@/lib/month-context";
import { useRealtimeSync } from "@/lib/use-realtime-sync";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TrendSparkline } from "@/components/charts/trend-sparkline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const accountSchema = z.object({
  provider: z.string().min(1),
  cost: z.coerce.number().min(0),
  purchase_date: z.string().min(1),
  status: z.enum(["active", "passed", "funded", "failed", "closed"]),
  note: z.string().optional(),
});
const payoutSchema = z.object({
  provider: z.string().min(1),
  amount: z.coerce.number().positive(),
  paid_on: z.string().min(1),
});

const STATUS_LABEL: Record<TradingStatus, string> = {
  active: "פעיל", passed: "עבר", funded: "מומן", failed: "נכשל", closed: "סגור",
};

export default function TradingPage() {
  const { month } = useMonth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [payouts, setPayouts] = useState<TradingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, p] = await Promise.all([getTradingAccounts(), getTradingPayouts()]);
    setAccounts(a);
    setPayouts(p);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtimeSync("trading_accounts", load);
  useRealtimeSync("trading_payouts", load);

  const monthAccounts = accounts.filter((a) => a.purchase_date.slice(0, 7) === month);
  const monthPayouts = payouts.filter((p) => p.paid_on.slice(0, 7) === month);
  const spend = sumBy(monthAccounts, (a) => a.cost);
  const payoutTotal = sumBy(monthPayouts, (p) => p.amount);
  const net = payoutTotal - spend;
  const roi = spend > 0 ? (net / spend) * 100 : 0;

  // All-time cumulative equity curve (payouts minus account costs, chronological)
  const events = [
    ...accounts.map((a) => ({ date: a.purchase_date, delta: -a.cost })),
    ...payouts.map((p) => ({ date: p.paid_on, delta: p.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const equityCurve = events.map((e) => {
    running += e.delta;
    return { label: e.date, value: running };
  });

  const totalCost = sumBy(accounts, (a) => a.cost);
  const totalPayouts = sumBy(payouts, (p) => p.amount);
  const netAllTime = totalPayouts - totalCost;
  const passedOrFunded = accounts.filter((a) => a.status === "passed" || a.status === "funded").length;
  const passRate = accounts.length > 0 ? (passedOrFunded / accounts.length) * 100 : 0;

  return (
    <div>
      <PageHeader title="מסחר" subtitle="חשבונות פרופ, תשלומים וביצועים" />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="הוצאה החודש" value={formatMoney(spend)} tone="destructive" />
        <StatCard label="תשלומים החודש" value={formatMoney(payoutTotal)} tone="primary" />
        <StatCard label="רווח/הפסד נטו" value={formatMoney(net)} tone={net >= 0 ? "primary" : "destructive"} />
        <StatCard label="ROI" value={formatPercent(roi)} tone={roi >= 0 ? "primary" : "destructive"} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="רווח/הפסד מצטבר (כל הזמנים)" value={formatMoney(netAllTime)} tone={netAllTime >= 0 ? "primary" : "destructive"} />
        <StatCard label="שיעור הצלחה" value={formatPercent(passRate)} tone={passRate >= 50 ? "primary" : "warning"} foot={`${passedOrFunded} מתוך ${accounts.length}`} />
        <StatCard label="סהֲכ הושקע בחשבונות" value={formatMoney(totalCost)} tone="destructive" />
        <StatCard label="סהֲכ תשלומים שהתקבלו" value={formatMoney(totalPayouts)} tone="primary" />
      </div>

      {equityCurve.length > 1 && (
        <Card className="mb-5">
          <CardHeader><CardTitle>עקומת הון מצטברת</CardTitle></CardHeader>
          <CardContent><TrendSparkline data={equityCurve} color={netAllTime >= 0 ? "#3ECF8E" : "#F2555A"} /></CardContent>
        </Card>
      )}

      <Card className="mb-5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>חשבונות מסחר</CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setAccountFormOpen(true)}><Plus className="h-3.5 w-3.5" /> הוספה</Button>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 rounded-lg" /> : accounts.length === 0 ? <EmptyState icon="📊" title="אין חשבונות מסחר עדיין" /> : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{a.provider}</div>
                    <div className="text-[11px] text-muted-foreground">{formatDate(a.purchase_date)}{a.note ? ` · ${a.note}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={a.status === "failed" ? "destructive" : a.status === "funded" || a.status === "passed" ? "default" : "secondary"}>{STATUS_LABEL[a.status]}</Badge>
                    <span className="font-tabular text-sm font-semibold text-destructive">-{formatMoney(a.cost)}</span>
                    <button onClick={async () => { await deleteTradingAccount(a.id); load(); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>תשלומים שהתקבלו</CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setPayoutFormOpen(true)}><Plus className="h-3.5 w-3.5" /> הוספה</Button>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 rounded-lg" /> : payouts.length === 0 ? <EmptyState icon="💸" title="אין תשלומים רשומים עדיין" /> : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{p.provider}</div>
                    <div className="text-[11px] text-muted-foreground">{formatDate(p.paid_on)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-tabular text-sm font-semibold text-primary">+{formatMoney(p.amount)}</span>
                    <button onClick={async () => { await deleteTradingPayout(p.id); load(); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AccountForm open={accountFormOpen} onOpenChange={setAccountFormOpen} onSaved={load} />
      <PayoutForm open={payoutFormOpen} onOpenChange={setPayoutFormOpen} onSaved={load} />
    </div>
  );
}

function AccountForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { provider: "", cost: 0, purchase_date: new Date().toISOString().slice(0, 10), status: "active" as TradingStatus, note: "" },
  });
  async function onSubmit(values: z.infer<typeof accountSchema>) {
    setSaving(true);
    try { await createTradingAccount(values); toast.success("החשבון נוסף"); reset(); onSaved(); onOpenChange(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "נכשל"); }
    finally { setSaving(false); }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
        <SheetHeader><SheetTitle>הוספת חשבון מסחר</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div className="space-y-1.5"><Label>ספק</Label><Input placeholder="Lucid, Apex..." {...register("provider")} />{errors.provider && <p className="text-xs text-destructive">{errors.provider.message}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>עלות</Label><Input type="number" step="0.01" {...register("cost")} /></div>
            <div className="space-y-1.5"><Label>תאריך רכישה</Label><Input type="date" {...register("purchase_date")} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>סטטוס</Label>
            <Controller control={control} name="status" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["active", "passed", "funded", "failed", "closed"] as const).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5"><Label>הערה</Label><Input {...register("note")} /></div>
          <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function PayoutForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof payoutSchema>>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { provider: "", amount: 0, paid_on: new Date().toISOString().slice(0, 10) },
  });
  async function onSubmit(values: z.infer<typeof payoutSchema>) {
    setSaving(true);
    try { await createTradingPayout(values); toast.success("התשלום נוסף"); reset(); onSaved(); onOpenChange(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : "נכשל"); }
    finally { setSaving(false); }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
        <SheetHeader><SheetTitle>הוספת תשלום</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div className="space-y-1.5"><Label>ספק</Label><Input {...register("provider")} />{errors.provider && <p className="text-xs text-destructive">{errors.provider.message}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>סכום</Label><Input type="number" step="0.01" {...register("amount")} /></div>
            <div className="space-y-1.5"><Label>תאריך</Label><Input type="date" {...register("paid_on")} /></div>
          </div>
          <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}שמור</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
