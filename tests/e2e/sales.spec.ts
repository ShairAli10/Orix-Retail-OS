import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";
test("Sales history filters and keyboard drawer work across window sizes", async () => {
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
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Sales History", exact: true })
      .click();
    const search = page.getByRole("textbox", { name: "Search sales" });
    await search.fill("no-such-invoice");
    await expect(page.getByText("No sales match your filters.")).toBeVisible();
    await search.fill("");
    const invoice = page.locator(".sale-invoice-link").first();
    await expect(invoice).toBeVisible();
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      expect(
        await page.locator(".main-content").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      expect(
        await page.locator(".sales-module .row-actions button").evaluateAll((buttons) =>
          buttons.every((button) => {
            const r = button.getBoundingClientRect();
            const parent = button.closest(".table-wrap")!.getBoundingClientRect();
            return r.left >= parent.left && r.right <= parent.right + 1;
          })
        )
      ).toBe(true);
      await page.screenshot({ path: `test-results/sales-list-${width}.png` });
      await invoice.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: /Sale details/ });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("columnheader", { name: "Returned", exact: true })
      ).toBeVisible();
      expect(
        await page.locator(".sale-details-drawer").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1;
        })
      ).toBe(true);
      await page.screenshot({ path: `test-results/sales-detail-${width}.png` });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(invoice).toBeFocused();
    }
  } finally {
    await app.close();
  }
});
