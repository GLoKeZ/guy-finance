"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Category, Transaction, TxType } from "@/lib/types";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const schema = z.object({
  type: z.enum(["expense", "income", "savings"]),
  amount: z.coerce.number().positive("Enter a valid amount"),
  category_id: z.string().min(1, "Pick a category"),
  description: z.string().min(1, "Required"),
  occurred_on: z.string().min(1),
  payment_method: z.string().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const PAYMENT_METHODS = ["Credit Card", "Bit", "Bank Transfer", "Cash", "Apple Pay", "Other"];

export function TransactionForm({
  open,
  onOpenChange,
  categories,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  editing?: Transaction | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          type: editing.type,
          amount: editing.amount,
          category_id: editing.category_id ?? "",
          description: editing.description,
          occurred_on: editing.occurred_on,
          payment_method: editing.payment_method ?? "Credit Card",
          note: editing.note ?? "",
        }
      : {
          type: "expense",
          amount: undefined,
          category_id: "",
          description: "",
          occurred_on: new Date().toISOString().slice(0, 10),
          payment_method: "Credit Card",
          note: "",
        },
  });

  const type = watch("type");
  const filteredCategories = categories.filter((c) => (type === "income" ? c.kind === "income" : type === "savings" ? c.kind === "savings" : c.kind !== "income"));

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      if (editing) {
        await updateTransaction(editing.id, { ...values, type: values.type as TxType });
        toast.success("Transaction updated");
      } else {
        await createTransaction({ ...values, type: values.type as TxType });
        toast.success("Transaction added");
      }
      reset();
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit transaction" : "Add transaction"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {(["expense", "income", "savings"] as const).map((t) => (
                  <motion.button
                    key={t}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => field.onChange(t)}
                    className={`rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors ${
                      field.value === t
                        ? t === "expense"
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : t === "income"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-accent bg-accent/10 text-accent"
                        : "border-input text-muted-foreground"
                    }`}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" inputMode="decimal" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" {...register("occurred_on")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description / Merchant</Label>
            <Input placeholder="e.g. Coffee, Lucid, Fuel..." {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Controller
              control={control}
              name="payment_method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input placeholder="Short note..." {...register("note")} />
          </div>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Add transaction"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
