import { describe, expect, it } from "vitest";
import { err, isErr, isOk, mapError, mapResult, ok, unwrapOr } from "./result.js";

describe("core result utilities", () => {
  it("creates and narrows successful results", () => {
    const result = ok(42);

    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    expect(result.value).toBe(42);
  });

  it("maps values and errors without throwing", () => {
    const mappedValue = mapResult(ok(10), (value) => value * 2);
    const mappedError = mapError(err("invalid"), (error) => ({ code: error }));

    expect(mappedValue).toEqual(ok(20));
    expect(mappedError).toEqual(err({ code: "invalid" }));
  });

  it("returns fallback values for failed results", () => {
    expect(unwrapOr(err("missing"), "fallback")).toBe("fallback");
    expect(unwrapOr(ok("value"), "fallback")).toBe("value");
  });
});
