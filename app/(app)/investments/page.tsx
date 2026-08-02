"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getInvestments, createInvestment, updateInvestment, deleteInvestment } from "@/lib/actions/investments";
import type { Investment, InvestmentKind } from "@/lib/types";
import { formatDate, formatMoney, formatPercent } from "@/lib/utils";
import { sumBy } from "@/lib/finance-calc";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  kind: z.enum(["stocks", "crypto", "real_estate", "fund", "other"]),
  amount_invested: z.coerce.number().min(0),
  current_value: z.coerce.number().min(0),
  purchase_date: z.string().min(1),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const KIND_LABEL: Record<InvestmentKind, string> = {
  stocks: "Stocks", crypto: "Crypto", real_estate: "Real Estate", fund: "Fund", other: "Other",
};

export default function InvestmentsPage() {
  const [items, setItems] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await getInvestments());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const invested = sumBy(items, (i) => i.amount_invested);
  const currentValue = sumBy(items, (i) => i.current_value);
  const gain = currentValue - invested;
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

  async function handleDelete(id: string) {
    await deleteInvestment(id);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Investments"
        subtitle="Stocks, crypto, real estate, and more"
        action={<Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total invested" value={formatMoney(invested)} />
        <StatCard label="Current value" value={formatMoney(currentValue)} tone="primary" />
        <StatCard label="Gain / Loss" value={formatMoney(gain)} tone={gain >= 0 ? "primary" : "destructive"} />
        <StatCard label="Return" value={formatPercent(gainPct)} tone={gainPct >= 0 ? "primary" : "destructive"} />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon="📈" title="No investments tracked yet" />
      ) : (
        <div className="space-y-2">
          {items.map((inv) => {
            const g = inv.current_value - inv.amount_invested;
            return (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between p-3.5">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">{inv.name} <Badge variant="secondary">{KIND_LABEL[inv.kind]}</Badge></div>
                    <div className="text-[11px] text-muted-foreground">Since {formatDate(inv.purchase_date)} · Invested {formatMoney(inv.amount_invested)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-tabular text-sm font-semibold">{formatMoney(inv.current_value)}</div>
                      <div className={`font-tabular text-[11px] ${g >= 0 ? "text-primary" : "text-destructive"}`}>{g >= 0 ? "+" : ""}{formatMoney(g)}</div>
                    </div>
                    <button onClick={() => { setEditing(inv); setFormOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(inv.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InvestmentForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={load} />
    </div>
  );
}

function InvestmentForm({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Investment | null; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? { name: editing.name, kind: editing.kind, amount_invested: editing.amount_invested, current_value: editing.current_value, purchase_date: editing.purchase_date, note: editing.note ?? "" }
      : { name: "", kind: "stocks" as InvestmentKind, amount_invested: 0, current_value: 0, purchase_date: new Date().toISOString().slice(0, 10), note: "" },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      if (editing) await updateInvestment(editing.id, values);
      else await createInvestment(values);
      toast.success("Saved");
      reset();
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
        <SheetHeader><SheetTitle>{editing ? "Edit investment" : "Add investment"}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input {...register("name")} placeholder="S&P 500 ETF, Bitcoin..." />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller control={control} name="kind" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Amount invested</Label><Input type="number" step="0.01" {...register("amount_invested")} /></div>
            <div className="space-y-1.5"><Label>Current value</Label><Input type="number" step="0.01" {...register("current_value")} /></div>
          </div>
          <div className="space-y-1.5"><Label>Purchase date</Label><Input type="date" {...register("purchase_date")} /></div>
          <div className="space-y-1.5"><Label>Note</Label><Input {...register("note")} /></div>
          <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
