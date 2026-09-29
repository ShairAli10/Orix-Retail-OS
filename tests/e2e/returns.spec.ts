import { _electron as electron, expect, test } from "@playwright/test";
import { resolve } from "node:path";
test("Sales return validates quantity and posts a refund in the isolated store", async () => {
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
    const row = page.locator("tbody tr").filter({ hasText: "SL-000001" });
    await row.getByRole("button", { name: "View details", exact: true }).click();
    await page.getByRole("button", { name: "Return items", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Return sale SL-000001", exact: true });
    await expect(dialog.getByRole("status")).toContainText("Enter a return quantity");
    const quantity = dialog.getByRole("spinbutton");
    await quantity.fill("2");
    await expect(dialog.getByRole("status")).toContainText("between zero and the available amount");
    await dialog.getByLabel("Reason", { exact: false }).fill("Test return");
    await expect(dialog.getByRole("button", { name: "Post Return", exact: true })).toBeDisabled();
    await quantity.fill("1");
    await expect(dialog.locator(".return-summary .metric-card")).toContainText("Rs 150.00");
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      expect(
        await dialog.locator(".modal").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      expect(
        await dialog.getByLabel("Refund Method").evaluate((el) => el.getBoundingClientRect().height)
      ).toBeLessThanOrEqual(44);
      await page.screenshot({ path: `test-results/returns-${width}.png` });
    }
    await quantity.fill("0.5");
    await dialog.getByRole("button", { name: "Post Return", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "Sale details SL-000001", exact: true })
    ).toBeVisible();
    await expect(page.locator(".sale-details-drawer tbody tr td").nth(2)).toHaveText("0.5");
    await page.keyboard.press("Escape");
    await expect(row).toContainText("Partially returned");
    await row.getByRole("button", { name: "View details", exact: true }).click();
    await page.getByRole("button", { name: "Return items", exact: true }).click();
    await quantity.fill("0.5");
    await dialog.getByLabel("Reason", { exact: false }).fill("Return remaining quantity");
    await expect(dialog.locator(".return-summary .metric-card")).toContainText("Rs 75.00");
    await dialog.getByRole("button", { name: "Post Return", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".sale-details-drawer tbody tr td").nth(2)).toHaveText("1");
    await page.keyboard.press("Escape");
    await expect(row).toContainText("Fully returned");
    await expect(row.getByRole("button", { name: "Return items", exact: true })).toHaveCount(0);
    await expect(row.locator(".pill")).toHaveText("Fully returned");
    await expect(row.locator(".sale-value > strong")).toHaveText("Rs 150.00");
    const creditRow = page.locator("tbody tr").filter({ hasText: "SL-000002" });
    await creditRow.getByRole("button", { name: "View details", exact: true }).click();
    await page.getByRole("button", { name: "Return items", exact: true }).click();
    const creditDialog = page.getByRole("dialog", { name: "Return sale SL-000002", exact: true });
    await expect(creditDialog.getByLabel("Refund Method")).toHaveValue("customer-credit");
    await creditDialog.getByRole("spinbutton").fill("1");
    await creditDialog.getByLabel("Reason", { exact: false }).fill("Credit return test");
    await creditDialog.getByRole("button", { name: "Post Return", exact: true }).click();
    await expect(creditDialog).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "Sale details SL-000002", exact: true })
    ).toBeVisible();
    await expect(page.locator(".sale-details-drawer tbody tr td").nth(2)).toHaveText("1");
  } finally {
    await app.close();
  }
});
