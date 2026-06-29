import type { AppThemePreference } from "@orix/electron";

export type ResolvedTheme = "light" | "dark";

export const resolveThemePreference = (
  theme: AppThemePreference,
  prefersDark: boolean
): ResolvedTheme => {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }
  return theme;
};
