import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("single counter setup guides the owner to trading readiness", async () => {
  const directory = mkdtempSync(join(tmpdir(), "orix-onboarding-test-"));
  const env = { ...process.env, ORIX_DEMO_DIRECTORY: directory };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [resolve("apps/desktop"), "--demo"], env });
  try {
    const page = await app.firstWindow();
    await expect(page.getByText(/Store essentials/)).toBeVisible();
    await page.screenshot({ path: "test-results/onboarding-store.png" });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    const contrast = () =>
      page.getByRole("button", { name: "Next", exact: true }).evaluate((button) => {
        const style = getComputedStyle(button);
        const luminance = (color: string) => {
          const channels = (color.match(/\d+/g) ?? [])
            .slice(0, 3)
            .map(Number)
            .map((value) => value / 255)
            .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
          return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
        };
        const fg = luminance(style.color);
        const bg = luminance(style.backgroundColor);
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
    await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: "test-results/onboarding-dark.png" });

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("textbox", { name: /^Store Name/ })).toBeFocused();
    await page.getByRole("textbox", { name: /^Store Name/ }).fill("Onboarding Test");
    await page.getByRole("textbox", { name: /^Owner Name/ }).fill("Test Owner");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByLabel("Full Name *", { exact: true })).toHaveValue("Test Owner");
    await expect(page.getByText("Use at least 8 characters.", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/^PIN \*/)).toHaveAttribute("type", "password");
    await page.getByLabel(/^Password \*/).fill("TestingOnly!2026");
    await page.getByLabel("Confirm Password *", { exact: true }).fill("TestingOnly!2026");
    await page.getByLabel(/^PIN \*/).fill("2468");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Tax disabled", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit store details", exact: true }).click();
    await expect(page.getByRole("textbox", { name: /^Store Name/ })).toHaveValue("Onboarding Test");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Create store", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Prepare your counter", exact: true })
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Prepare your counter", exact: true })
    ).toBeVisible();
    await page.screenshot({ path: "test-results/onboarding-readiness.png", fullPage: true });
    await page.getByRole("button", { name: "Sell", exact: true }).click();
    await expect(page.getByRole("button", { name: "Add first items", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open counter", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByRole("button", { name: "Complete Sale", exact: true })).toBeInViewport();
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
