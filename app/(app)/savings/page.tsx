"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/lib/actions/goals";
import type { Goal } from "@/lib/types";
import { formatMoney, formatPercent } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const schema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  target_amount: z.coerce.number().positive(),
  current_amount: z.coerce.number().min(0),
  monthly_contribution: z.coerce.number().min(0),
});
type FormValues = z.infer<typeof schema>;

export default function SavingsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setGoals(await getGoals());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    await deleteGoal(id);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Savings Goals"
        subtitle="Track progress toward what matters"
        action={<Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> New goal</Button>}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : goals.length === 0 ? (
        <EmptyState icon="🏁" title="No goals yet — create your first one" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.map((g, i) => {
            const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0;
            const remaining = Math.max(g.target_amount - g.current_amount, 0);
            const monthsLeft = g.monthly_contribution > 0 ? Math.ceil(remaining / g.monthly_contribution) : null;
            let eta: string | null = null;
            if (monthsLeft !== null && remaining > 0) {
              const d = new Date();
              d.setMonth(d.getMonth() + monthsLeft);
              eta = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
            }
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">{g.icon} {g.name}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(g); setFormOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(g.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="mb-2 font-tabular text-sm text-muted-foreground">{formatMoney(g.current_amount)} / {formatMoney(g.target_amount)}</div>
                    <Progress value={pct} />
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {formatPercent(pct)} complete
                      {monthsLeft !== null && remaining > 0 && ` · ${monthsLeft} months left at ${formatMoney(g.monthly_contribution)}/mo`}
                      {eta && ` · target: ${eta}`}
                      {remaining <= 0 && " · 🎉 Completed!"}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <GoalForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={load} />
    </div>
  );
}

function GoalForm({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Goal | null; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? { name: editing.name, icon: editing.icon, target_amount: editing.target_amount, current_amount: editing.current_amount, monthly_contribution: editing.monthly_contribution }
      : { name: "", icon: "🏁", target_amount: 0, current_amount: 0, monthly_contribution: 0 },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      if (editing) await updateGoal(editing.id, values);
      else await createGoal(values);
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
        <SheetHeader><SheetTitle>{editing ? "Edit goal" : "New goal"}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div className="grid grid-cols-[1fr_4fr] gap-3">
            <div className="space-y-1.5"><Label>Icon</Label><Input {...register("icon")} /></div>
            <div className="space-y-1.5"><Label>Name</Label><Input {...register("name")} placeholder="Emergency Fund" />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Target amount</Label><Input type="number" step="0.01" {...register("target_amount")} /></div>
            <div className="space-y-1.5"><Label>Current amount</Label><Input type="number" step="0.01" {...register("current_amount")} /></div>
          </div>
          <div className="space-y-1.5"><Label>Monthly contribution</Label><Input type="number" step="0.01" {...register("monthly_contribution")} /></div>
          <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
