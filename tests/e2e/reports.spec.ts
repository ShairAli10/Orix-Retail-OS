import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";
test("Reports applies date filters explicitly and supports responsive keyboard tabs", async () => {
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
    await page.locator(".sidebar").getByRole("button", { name: "Reports", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Daily Sales", exact: true })).toBeVisible();
    await page.getByLabel("From", { exact: true }).fill("2020-01-01");
    // Cover the seeded sale regardless of the runner and store timezones.
    await page.getByLabel("To", { exact: true }).fill("2030-01-01");
    await expect(page.getByText("Date changes have not been applied.")).toBeVisible();
    await page.getByRole("button", { name: "Run Reports", exact: true }).click();
    await expect(page.getByText("Date changes have not been applied.")).toHaveCount(0);
    await expect(page.getByRole("tabpanel")).toContainText("SL-");
    await page.getByLabel("To", { exact: true }).fill("2019-01-01");
    await page.getByRole("button", { name: "Run Reports", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("End date must be on or after start date.");
    await page.getByLabel("To", { exact: true }).fill("2030-01-01");
    await page.getByRole("button", { name: "Run Reports", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByRole("tab", { name: "Daily Sales", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Cash Drawer", exact: true })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      for (const name of [
        "Daily Sales",
        "Cash Drawer",
        "Inventory Value",
        "Low Stock",
        "Receivables",
        "Payables"
      ]) {
        await page.getByRole("tab", { name, exact: true }).click();
        expect(
          await page.locator(".main-content").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
        ).toBe(true);
        expect(
          await page
            .locator(".report-summary-grid strong")
            .evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth + 1))
        ).toBe(true);
      }
      await page.screenshot({ path: `test-results/reports-${width}.png` });
    }
  } finally {
    await app.close();
  }
});
