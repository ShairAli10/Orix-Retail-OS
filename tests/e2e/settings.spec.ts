import { _electron as electron, expect, test } from "@playwright/test";
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
    await page.getByLabel("Store display name *", { exact: true }).fill("");
    await page.getByRole("button", { name: "Save Settings", exact: true }).click();
    await expect(page.getByRole("textbox", { name: /^Store display name/ })).toBeFocused();
  } finally {
    await app.close();
  }
});
