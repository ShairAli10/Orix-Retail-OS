import { describe, expect, it } from "vitest";
import { spacingTokens, themeTokens, uiClassNames } from "./index.js";

describe("ui design system", () => {
  it("provides stable component class names", () => {
    expect(uiClassNames.button("primary")).toBe("ui-button ui-button-primary");
    expect(uiClassNames.badge("warning")).toBe("ui-badge ui-badge-warning");
    expect(uiClassNames.pageHeader).toBe("ui-page-header");
    expect(uiClassNames.emptyState).toBe("ui-empty-state");
  });

  it("defines shared spacing and theme tokens", () => {
    expect(spacingTokens.md).toBe("12px");
    expect(themeTokens.light.primary).toBe("#0f766e");
    expect(themeTokens.dark.primary).toBe("#2dd4bf");
  });
});
