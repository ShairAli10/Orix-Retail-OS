import { describe, expect, it } from "vitest";
import { salesPeriodRange } from "./sales-period.js";

describe("sales calendar filters", () => {
  const now = new Date(2026, 9, 1, 18, 30);
  it("uses local midnight and exclusive next midnight", () => {
    const range = salesPeriodRange("today", "", "", now);
    expect(range.dateFrom).toBe(new Date(2026, 9, 1).toISOString());
    expect(range.dateBefore).toBe(new Date(2026, 9, 2).toISOString());
  });
  it("handles yesterday across month boundaries and seven inclusive calendar dates", () => {
    expect(salesPeriodRange("yesterday", "", "", now).dateFrom).toBe(new Date(2026, 8, 30).toISOString());
    expect(salesPeriodRange("week", "", "", now).dateFrom).toBe(new Date(2026, 8, 25).toISOString());
  });
  it("includes the custom end date and rejects missing or reversed dates", () => {
    expect(salesPeriodRange("custom", "2026-09-29", "2026-09-30", now).dateBefore).toBe(new Date(2026, 9, 1).toISOString());
    expect(salesPeriodRange("custom", "", "2026-09-30", now).error).toBeTruthy();
    expect(salesPeriodRange("custom", "2026-10-01", "2026-09-30", now).error).toBeTruthy();
    expect(salesPeriodRange("all", "", "", now).dateFrom).toBeUndefined();
  });
});
