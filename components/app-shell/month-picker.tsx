"use client";
import { useEffect, useState } from "react";
import { useMonth } from "@/lib/month-context";
import { getAvailableMonths } from "@/lib/actions/transactions";
import { monthLabel } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MonthPicker() {
  const { month, setMonth } = useMonth();
  const [months, setMonths] = useState<string[]>([month]);

  useEffect(() => {
    getAvailableMonths().then((list) => {
      setMonths(list.includes(month) ? list : [month, ...list]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Select value={month} onValueChange={setMonth}>
      <SelectTrigger className="h-9 w-[150px] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m} value={m}>
            {monthLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
