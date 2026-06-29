import { describe, expect, it } from "vitest";
import { resolveThemePreference } from "./preferences.js";

describe("desktop shell preferences", () => {
  it("resolves explicit themes", () => {
    expect(resolveThemePreference("light", true)).toBe("light");
    expect(resolveThemePreference("dark", false)).toBe("dark");
  });

  it("resolves system theme from OS preference", () => {
    expect(resolveThemePreference("system", true)).toBe("dark");
    expect(resolveThemePreference("system", false)).toBe("light");
  });
});
