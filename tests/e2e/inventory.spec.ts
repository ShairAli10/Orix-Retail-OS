import { _electron as electron, expect, test } from "@playwright/test";
import { resolve } from "node:path";
test("Inventory presents readable columns and accessible item details", async () => {
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
    await page.locator(".sidebar").getByRole("button", { name: "Stock", exact: true }).click();
    const columns = page.getByRole("combobox", { name: "Visible inventory columns" });
    await expect(columns).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "SKU", exact: true })).toHaveCount(0);
    await expect(columns).not.toContainText("currentStock");
    await columns.selectOption("sku");
    await expect(page.getByRole("columnheader", { name: "SKU", exact: true })).toBeVisible();
    await columns.selectOption("sku");
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      expect(
        await page.locator(".main-content").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      expect(
        await page
          .locator(".inventory-metrics strong")
          .evaluateAll((elements) => elements.every((el) => el.scrollWidth <= el.clientWidth + 1))
      ).toBe(true);
      await page.screenshot({ path: `test-results/inventory-${width}.png` });
    }
    const item = page.locator(".inventory-table .inventory-item-link").first();
    await item.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".drawer")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Adjust Stock", exact: true }).click();
    await expect(page.locator(".modal")).toBeVisible();
    expect(
      await page.locator(".modal").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
    ).toBe(true);
    await page.locator(".modal header button").click();
  } finally {
    await app.close();
  }
});
