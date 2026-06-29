import { describe, expect, it } from "vitest";
import { err, isErr, isOk, Money, ok, Quantity } from "./index.js";

describe("shared primitives", () => {
  it("represents successful and failed results", () => {
    const success = ok("ready");
    const failure = err({ code: "not_ready" });

    expect(isOk(success)).toBe(true);
    expect(isErr(failure)).toBe(true);
  });

  it("adds money in the same currency", () => {
    const total = Money.fromMinor(100, "PKR").add(Money.fromMinor(50, "PKR"));

    expect(total.amountMinor).toBe(150);
    expect(total.currencyCode).toBe("PKR");
  });

  it("accepts decimal-safe quantities", () => {
    const quantity = Quantity.fromString("10.500");

    expect(quantity.value).toBe("10.500");
  });
});
