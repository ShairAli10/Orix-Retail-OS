import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";
test("Counter expenses and closing explain shortages at desktop widths", async () => {
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
    await expect(page.getByLabel("Username", { exact: true })).toBeVisible({ timeout: 15000 });
    page.setDefaultTimeout(5000);
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Counter & Expenses", exact: true })
      .click();
    const counter = page.locator(".counter-page");
    await expect(counter.getByText("Counter is open", { exact: true })).toBeVisible();
    await counter.getByLabel("Expense description").fill("Delivery charge");
    await counter.getByLabel("Expense amount").fill("50");
    await counter.getByRole("button", { name: "Record Expense", exact: true }).click();
    await expect(counter.getByRole("status")).toContainText("Expense recorded.");
    await expect(counter.locator("tbody tr").filter({ hasText: "Delivery charge" })).toHaveCount(1);
    await counter.getByLabel("Counted cash", { exact: true }).fill("0");
    await expect(counter.locator(".counter-variance")).toContainText("Cash shortage");
    await expect(counter.getByLabel("Difference explanation")).toHaveAttribute("required", "");
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      expect(await counter.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `test-results/counter-${width}.png` });
    }
    await counter.getByLabel("Difference explanation").fill("Test cash count shortage");
    page.once("dialog", (dialog) => dialog.accept());
    await counter.getByRole("button", { name: "Close Counter", exact: true }).click();
    await expect(counter.getByText("Counter is closed", { exact: true })).toBeVisible();
    await expect(counter.getByRole("heading", { name: "Closing summary" })).toBeVisible();
    await expect(
      counter.getByRole("button", { name: "Record Expense", exact: true })
    ).toBeDisabled();
    const closed = await page.evaluate(() => window.orix.counter.summary());
    await expect(
      counter.getByRole("button", { name: "Reopen counter", exact: true })
    ).toBeDisabled();
    await counter.getByLabel("Reason for reopening").fill("Closed before the final customer");
    await counter.getByRole("button", { name: "Reopen counter", exact: true }).click();
    await expect(counter.getByText("Counter is open", { exact: true })).toBeVisible();
    await expect(counter.getByLabel("Counted cash", { exact: true })).toHaveValue("");
    const reopened = await page.evaluate(() => window.orix.counter.summary());
    expect(
      closed.ok && reopened.ok && reopened.value.session?.id === closed.value.session?.id
    ).toBe(true);
    expect(
      closed.ok &&
        reopened.ok &&
        reopened.value.expectedCashMinor === closed.value.expectedCashMinor
    ).toBe(true);
    await expect(page.locator(".title-bar")).toContainText("Business Day Open");
  } finally {
    await app.close();
  }
});
