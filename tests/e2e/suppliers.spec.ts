import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";
test("Suppliers keep balances and actions readable with accessible dialogs", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Use isolated demo runner");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [resolve("apps/desktop"), "--demo"],
    env,
    timeout: 10000
  });
  try {
    const page = await app.firstWindow();
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.locator(".sidebar").getByRole("button", { name: "Suppliers", exact: true }).click();

    await expect(page.getByRole("columnheader", { name: "Avatar", exact: true })).toHaveCount(0);
    const customer = page.locator(".supplier-name-link").first();
    await expect(customer).toBeVisible();
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      expect(
        await page.locator(".supplier-module .row-actions button").evaluateAll((buttons) =>
          buttons.every((button) => {
            const r = button.getBoundingClientRect();
            return r.left >= 0 && r.right <= innerWidth;
          })
        )
      ).toBe(true);
      await page.screenshot({ path: `test-results/suppliers-${width}.png` });
    }
    await customer.focus();
    await page.keyboard.press("Enter");
    const profile = page.getByRole("dialog", { name: /Supplier details/ });
    await expect(profile).toBeVisible();
    await expect(profile.getByRole("button", { name: "WhatsApp" })).toHaveCount(0);
    await profile.getByRole("button", { name: "Record Payment", exact: true }).click();
    const payment = page.getByRole("dialog", { name: "Record supplier payment" });
    await expect(payment).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(profile).toBeVisible();
    await profile.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit Supplier", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(profile).toBeVisible();
    await profile.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(profile).not.toContainText("metadata_json");
    await page.screenshot({ path: "test-results/supplier-profile-800.png" });
    await page.keyboard.press("Escape");
    await expect(profile).toHaveCount(0);
  } finally {
    await app.close();
  }
});
