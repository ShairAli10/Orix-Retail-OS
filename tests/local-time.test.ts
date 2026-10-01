import { describe, expect, it } from "vitest";
import {
  localDateInput,
  localDateTimeInput,
  displayLocalDate
} from "../apps/desktop/src/renderer/presentation/local-time.js";

describe("local form dates", () => {
  it("uses the computer calendar and wall clock instead of UTC slices", () => {
    const date = new Date(2026, 9, 1, 0, 15);
    expect(localDateInput(date)).toBe("2026-10-01");
    expect(localDateTimeInput(date)).toBe("2026-10-01T00:15");
  });
  it("preserves date-only documents without shifting their calendar day", () => {
    expect(displayLocalDate("2026-10-01")).toBe(new Date(2026, 9, 1).toLocaleDateString("en-PK"));
  });
});
