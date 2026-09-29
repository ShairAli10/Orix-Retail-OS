import { expect, it } from "vitest";
import { localDateTimeInput } from "./local-time.js";
it("formats the wall clock without converting it to UTC", () => {
  const date = new Date(2026, 8, 29, 19, 34);
  expect(localDateTimeInput(date)).toBe("2026-09-29T19:34");
  expect(new Date(localDateTimeInput(date)).getTime()).toBe(date.getTime());
});
