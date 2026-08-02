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
  amount: z.coerce.number().positive("יש להזין סכום תקין"),
  category_id: z.string().min(1, "יש לבחור קטגוריה"),
  description: z.string().min(1, "שדה חובה"),
  occurred_on: z.string().min(1),
  payment_method: z.string().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const PAYMENT_METHODS = ["אשראי", "ביט", "העברה בנקאית", "מזומן", "Apple Pay", "אחר"];
const TYPE_LABEL: Record<string, string> = { expense: "הוצאה", income: "הכנסה", savings: "חיסכון" };

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
          payment_method: editing.payment_method ?? "אשראי",
          note: editing.note ?? "",
        }
      : {
          type: "expense",
          amount: undefined,
          category_id: "",
          description: "",
          occurred_on: new Date().toISOString().slice(0, 10),
          payment_method: "אשראי",
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
        toast.success("העסקה עודכנה");
      } else {
        await createTransaction({ ...values, type: values.type as TxType });
        toast.success("העסקה נוספה");
      }
      reset();
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "משהו השתבש");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:mx-auto sm:max-w-md sm:rounded-2xl">
        <SheetHeader>
          <SheetTitle>{editing ? "עריכת עסקה" : "הוספת עסקה"}</SheetTitle>
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
                    className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                      field.value === t
                        ? t === "expense"
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : t === "income"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-accent bg-accent/10 text-accent"
                        : "border-input text-muted-foreground"
                    }`}
                  >
                    {TYPE_LABEL[t]}
                  </motion.button>
                ))}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>סכום</Label>
              <Input type="number" step="0.01" inputMode="decimal" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>תאריך</Label>
              <Input type="date" {...register("occurred_on")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>תיאור / שם בית עסק</Label>
            <Input placeholder="לדוגמה: קפה, Lucid, דלק..." {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>קטגוריה</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
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
            <Label>אמצעי תשלום</Label>
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
            <Label>הערה (לא חובה)</Label>
            <Input placeholder="הערה קצרה..." {...register("note")} />
          </div>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "שמור שינויים" : "הוסף עסקה"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
