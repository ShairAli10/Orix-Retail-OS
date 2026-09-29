import { expect, it } from "vitest";
import { businessDate, businessDateRange } from "./business-time.js";
it("uses the store date instead of the UTC date around midnight", () => {
  expect(businessDate("2026-09-23T20:00:00.000Z", "Asia/Karachi")).toBe("2026-09-24");
  expect(businessDateRange("2026-09-24", "2026-09-24", "Asia/Karachi")).toEqual({
    from: "2026-09-23T19:00:00.000Z",
    to: "2026-09-24T18:59:59.999Z"
  });
});
it("handles daylight saving dates and rejects invalid ranges", () => {
  expect(businessDateRange("2026-03-08", "2026-03-08", "America/New_York")).toEqual({
    from: "2026-03-08T05:00:00.000Z",
    to: "2026-03-09T03:59:59.999Z"
  });
  expect(() => businessDateRange("2026-02-30", "2026-03-01", "Asia/Karachi")).toThrow();
  expect(() => businessDateRange("2026-09-24", "2026-09-23", "Asia/Karachi")).toThrow();
});
