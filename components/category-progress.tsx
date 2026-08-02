import { cn, formatMoney, formatPercent } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function CategoryProgress({
  icon,
  name,
  spent,
  budget,
  currency = "ILS",
}: {
  icon: string;
  name: string;
  spent: number;
  budget: number;
  currency?: string;
}) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : spent > 0 ? 100 : 0;
  const state = budget > 0 ? (spent / budget) * 100 : 0;
  const indicatorClass =
    state >= 100 ? "bg-destructive" : state >= 80 ? "bg-warning" : "bg-primary";

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium">
          {icon} {name}
        </span>
        <span className="font-tabular text-xs text-muted-foreground">
          {formatMoney(spent, currency)} / {formatMoney(budget, currency)} ({formatPercent(state)})
        </span>
      </div>
      <Progress value={pct} indicatorClassName={cn(indicatorClass)} />
    </div>
  );
}
