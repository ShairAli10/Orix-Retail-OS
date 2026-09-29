import { expect, it } from "vitest";
import { LoginLimiter } from "./login-limiter.js";
it("limits repeated login attempts without blocking other accounts and permits retry after cooldown", () => {
  let now = 0;
  const limiter = new LoginLimiter(() => now);
  for (let i = 0; i < 5; i++) {
    expect(limiter.allowed("owner")).toBe(true);
    limiter.failed("owner");
  }
  expect(limiter.allowed("owner")).toBe(false);
  expect(limiter.allowed("cashier")).toBe(true);
  now = 60001;
  expect(limiter.allowed("owner")).toBe(true);
  limiter.failed("owner");
  limiter.succeeded("owner");
  expect(limiter.allowed("owner")).toBe(true);
});
