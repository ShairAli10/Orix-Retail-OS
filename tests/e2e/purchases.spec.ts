import { _electron as electron, expect, test } from "@playwright/test";
import { resolve } from "node:path";
test("Buy Stock saves, receives and previews a net supplier return", async () => {
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
    page.setDefaultTimeout(5000);
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.locator(".sidebar").getByRole("button", { name: "Buy Stock", exact: true }).click();
    await page.getByRole("button", { name: "New Purchase", exact: true }).click();
    const form = page.getByRole("dialog", { name: "New purchase", exact: true });
    await form.getByLabel("Supplier", { exact: false }).selectOption({ index: 1 });
    await form.getByLabel("Item", { exact: true }).selectOption({ index: 1 });
    await form.getByLabel("Quantity", { exact: true }).fill("2");
    await form.getByLabel("Unit cost", { exact: true }).fill("100");
    await form.getByLabel("Purchase Discount", { exact: true }).fill("10");
    await form.getByLabel("Tax", { exact: true }).fill("5");
    await form.getByLabel("Freight", { exact: true }).fill("20");
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      expect(
        await form.locator(".modal").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      await page.screenshot({ path: `test-results/purchase-form-${width}.png` });
    }
    await form.getByRole("button", { name: "Save Draft", exact: true }).click();
    const detail = page.getByRole("dialog", { name: /Purchase details/ });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("Rs 215.00");
    await page.keyboard.press("Escape");
    const row = page.locator(".purchase-module tbody tr").first();
    await row.getByRole("button", { name: "Receive", exact: true }).click();
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("Received");
    await expect(detail).toContainText("Rs 215.00");
    await page.keyboard.press("Escape");
    await row.getByRole("button", { name: "Return", exact: true }).click();
    const returns = page.getByRole("dialog", { name: /Return purchase/ });
    await returns.getByRole("spinbutton").fill("1");
    await expect(returns.locator(".return-summary")).toContainText("Rs 97.50");
    await returns.getByLabel("Reason", { exact: false }).fill("Supplier return test");
    await returns.getByRole("button", { name: "Post Return", exact: true }).click();
    await expect(detail).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(row).toContainText("Rs 215.00");
    await page.screenshot({ path: "test-results/purchase-list-800.png" });
    expect(
      await page
        .locator(".purchase-module .row-actions button")
        .evaluateAll((buttons) =>
          buttons.every((button) => button.getBoundingClientRect().right <= innerWidth)
        )
    ).toBe(true);
  } finally {
    await app.close();
  }
});
