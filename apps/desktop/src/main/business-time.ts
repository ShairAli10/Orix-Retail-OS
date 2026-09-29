const parts = (instant: string | Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(instant));
export const businessDate = (instant: string | Date, timeZone: string): string => {
  const values = Object.fromEntries(parts(instant, timeZone).map((p) => [p.type, p.value]));
  return `${String(values.year)}-${String(values.month)}-${String(values.day)}`;
};
const midnight = (date: string, timeZone: string): number => {
  const target = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 10) !== date)
    throw new Error("Invalid report date.");
  let guess = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const values = Object.fromEntries(
      parts(new Date(guess), timeZone).map((p) => [p.type, p.value])
    );
    const represented = Date.parse(
      `${String(values.year)}-${String(values.month)}-${String(values.day)}T${String(values.hour)}:${String(values.minute)}:${String(values.second)}.000Z`
    );
    const adjustment = target - represented;
    if (adjustment === 0) return guess;
    guess += adjustment;
  }
  throw new Error("Could not resolve the store's midnight.");
};
export const businessDateRange = (
  dateFrom: string,
  dateTo: string,
  timeZone: string
): { from: string; to: string } => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateTo) ||
    dateFrom > dateTo
  )
    throw new Error("Invalid report date range.");
  const from = midnight(dateFrom, timeZone);
  midnight(dateTo, timeZone);
  const nextDate = new Date(Date.parse(`${dateTo}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  return {
    from: new Date(from).toISOString(),
    to: new Date(midnight(nextDate, timeZone) - 1).toISOString()
  };
};
