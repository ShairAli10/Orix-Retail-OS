import { localDateInput } from "./local-time.js";

export type SalesPeriod = "today" | "yesterday" | "week" | "custom" | "all";

export const salesPeriodRange = (
  period: SalesPeriod,
  from: string,
  to: string,
  now = new Date()
): { dateFrom?: string; dateBefore?: string; label: string; error?: string } => {
  if (period === "all") return { label: "All dates" };
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  if (period === "custom") {
    const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && localDateInput(new Date(`${value}T00:00:00`)) === value;
    if (!valid(from) || !valid(to) || from > to)
      return { label: "Custom range", error: "Choose valid dates with From on or before To." };
    start.setTime(new Date(`${from}T00:00:00`).getTime());
    end.setTime(new Date(`${to}T00:00:00`).getTime());
  } else if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (period === "week") {
    start.setDate(start.getDate() - 6);
  }
  const label = `${start.toLocaleDateString("en-PK")} – ${end.toLocaleDateString("en-PK")} · Local time`;
  end.setDate(end.getDate() + 1);
  return { dateFrom: start.toISOString(), dateBefore: end.toISOString(), label };
};
