import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";

test("Settings keeps draft changes explicit and sections usable", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Run with isolated demo profile");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    timeout: 10000,
    args: [resolve("apps/desktop"), "--demo"],
    env
  });
  try {
    const page = await app.firstWindow();

    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.locator(".sidebar").getByRole("button", { name: "Settings", exact: true }).click();

    await page.getByRole("tab", { name: "Users", exact: true }).click();
    for (const width of [1440, 800]) {
      await page.setViewportSize({ width, height: 768 });
      await expect(page.getByRole("button", { name: "New user", exact: true })).toBeVisible();
      expect(
        await page
          .locator(".user-management")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      await page.screenshot({ path: `test-results/settings-users-${width}.png` });
    }
    await page.getByRole("button", { name: "New user", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "New user", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/settings-user-editor-800.png" });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New user", exact: true })).toBeFocused();
    await page.getByRole("tab", { name: "Store & appearance", exact: true }).click();

    const before = await page.evaluate(() => window.orix.settings.get());

    expect(before.ok).toBe(true);
    await page
      .getByLabel("Store display name *", { exact: true })
      .fill("Unsaved test name", { timeout: 3000 });

    await page
      .getByRole("combobox", { name: "Theme", exact: true })
      .selectOption("dark", { timeout: 3000 });

    const after = await page.evaluate(() => window.orix.settings.get());
    expect(after).toEqual(before);
    await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      await page.getByRole("tab", { name: "Data & backup", exact: true }).click();
      await expect(
        page.getByRole("tabpanel", { name: "Data & backup", exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save Settings", exact: true })
      ).not.toBeVisible();
      expect(
        await page.locator(".main-content").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      await page.screenshot({ path: `test-results/settings-backup-${width}.png` });
    }
    await page.getByRole("tab", { name: "Store & appearance", exact: true }).click();
    await expect(page.getByLabel("Store display name *", { exact: true })).toHaveValue(
      "Unsaved test name"
    );
    await page.getByRole("tab", { name: "Store & appearance", exact: true }).press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Receipts", exact: true })).toBeFocused();
    await expect(page.getByRole("tabpanel", { name: "Receipts", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Store & appearance", exact: true }).click();
    await page.getByRole("button", { name: "Save Settings", exact: true }).click();
    await expect(page.locator(".toast")).toHaveText("Settings saved.");
    expect(await page.getByText("Settings saved.", { exact: true }).count()).toBe(1);
    await page.screenshot({ path: "test-results/settings-single-notification.png" });
    await page.getByLabel("Store display name *", { exact: true }).fill("");
    await page.getByRole("button", { name: "Save Settings", exact: true }).click();
    await expect(page.getByRole("textbox", { name: /^Store display name/ })).toBeFocused();
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    const logoutDialog = page.getByRole("dialog", { name: "Log out of Orix" });
    await logoutDialog.getByRole("button", { name: "Stay signed in" }).click();
    await expect(page.getByRole("textbox", { name: /^Store display name/ })).toHaveValue("");
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await logoutDialog.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();
    const denied = await page.evaluate(() => window.orix.users.list({ search: "", status: "all" }));
    expect(denied.ok).toBe(false);
    await page.getByLabel("Username", { exact: true }).fill("cashier");
    await page.locator('input[type="password"]').fill("DemoCashier!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.locator(".title-meta")).toContainText("Demo Cashier");
  } finally {
    await app.close();
  }
});
