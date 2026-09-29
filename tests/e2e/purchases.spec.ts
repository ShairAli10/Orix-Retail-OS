import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";
test("Trading day receives stock, returns, pays supplier, sells and closes", async () => {
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
    await page.locator(".sidebar").getByRole("button", { name: "Suppliers", exact: true }).click();
    await page.locator(".supplier-name-link").first().click();
    const profile = page.getByRole("dialog", { name: /Supplier details/ });
    const supplierName = await profile.locator("h2").first().innerText();
    await profile.getByRole("button", { name: "Buy from this supplier", exact: true }).click();
    const form = page.getByRole("dialog", { name: "New purchase", exact: true });
    await expect(
      form.getByLabel("Supplier", { exact: false }).locator("option:checked")
    ).toHaveText(supplierName);
    await form.getByLabel("Item", { exact: true }).selectOption({ index: 1 });
    const supplierId = await form.getByLabel("Supplier", { exact: false }).inputValue();
    const productId = await form.getByLabel("Item", { exact: true }).inputValue();
    const snapshot = () =>
      page.evaluate(
        async ({ supplierId, productId }) => {
          const supplier = await window.orix.suppliers.get(supplierId);
          const product = await window.orix.products.get(productId);
          const cash = await window.orix.cashRegister.summary();
          if (!supplier.ok || !supplier.value || !product.ok || !product.value || !cash.ok)
            throw new Error("Snapshot failed");
          return {
            balance: supplier.value.outstandingBalanceMinor,
            stock: product.value.currentStock,
            cash: cash.value.expectedCashMinor
          };
        },
        { supplierId, productId }
      );
    const before = await snapshot();
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
    expect(await snapshot()).toEqual(before);
    await page.keyboard.press("Escape");
    const row = page.locator(".purchase-module tbody tr").first();
    await row.getByRole("button", { name: "Receive stock", exact: true }).click();
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("Received");
    expect(await snapshot()).toEqual({
      ...before,
      stock: before.stock + 2,
      balance: before.balance + 21500
    });
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
    const afterReturn = await snapshot();
    expect(afterReturn).toEqual({
      ...before,
      stock: before.stock + 1,
      balance: before.balance + 21500 - 9750
    });
    await page.screenshot({ path: "test-results/purchase-list-800.png" });
    expect(
      await page
        .locator(".purchase-module .row-actions button")
        .evaluateAll((buttons) =>
          buttons.every((button) => button.getBoundingClientRect().right <= innerWidth)
        )
    ).toBe(true);
    await row.getByRole("button", { name: "View balance / pay", exact: true }).click();
    await expect(profile).toBeVisible();
    await profile.getByRole("button", { name: "Record Payment", exact: true }).click();
    const payment = page.getByRole("dialog", { name: "Record supplier payment", exact: true });
    await payment.getByLabel("Amount", { exact: false }).fill("50");
    await payment.getByRole("button", { name: "Record Payment", exact: true }).click();
    await expect(payment).not.toBeVisible();
    await expect(profile).toBeVisible();
    expect(await snapshot()).toEqual({
      ...afterReturn,
      balance: afterReturn.balance - 5000,
      cash: afterReturn.cash - 5000
    });
    await profile.getByRole("button", { name: "Record Payment", exact: true }).click();
    await payment.getByLabel("Amount", { exact: false }).fill("25");
    await payment.getByRole("button", { name: "Record Payment", exact: true }).click();
    await expect(payment).not.toBeVisible();
    await expect(profile).toBeVisible();
    expect(await snapshot()).toEqual({
      ...afterReturn,
      balance: afterReturn.balance - 7500,
      cash: afterReturn.cash - 7500
    });
    await page.keyboard.press("Escape");
    await page.locator(".sidebar").getByRole("button", { name: "Buy Stock", exact: true }).click();
    await expect(page.locator(".purchase-module")).not.toContainText("Unpaid");
    const item = await page.evaluate(async (id) => {
      const result = await window.orix.products.get(id);
      if (!result.ok || !result.value) throw new Error("Item unavailable");
      return result.value;
    }, productId);
    await page.locator(".sidebar").getByRole("button", { name: "Sell", exact: true }).click();
    const barcode = page.getByRole("textbox", { name: "Scan barcode", exact: true });
    await barcode.fill(item.barcode!);
    await barcode.press("Enter");
    await expect(page.locator(".cart-lines")).toContainText(item.name);
    await page.getByRole("button", { name: "Exact", exact: true }).click();
    await page.getByRole("button", { name: "Complete Sale", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Sale", exact: true }).click();
    await expect(page.getByText("Cart is empty", { exact: true })).toBeVisible();
    const sold = await snapshot();
    expect(sold).toEqual({
      stock: before.stock,
      balance: afterReturn.balance - 7500,
      cash: afterReturn.cash - 7500 + item.salePriceMinor
    });
    await page.getByRole("button", { name: "New Sale", exact: true }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Counter & Expenses", exact: true })
      .click();
    await page.getByLabel("Expense description").fill("Trading day delivery");
    await page.getByLabel("Expense amount").fill("10");
    await page.getByRole("button", { name: "Record Expense", exact: true }).click();
    await expect(page.getByText("Trading day delivery", { exact: true })).toBeVisible();
    const closingCash = sold.cash - 1000;
    expect(await snapshot()).toEqual({ ...sold, cash: closingCash });
    const reconciliation = await page.evaluate(async (supplierId) => {
      const home = await window.orix.dashboard.get();
      const report = await window.orix.reports.summary({
        dateFrom: "2020-01-01",
        dateTo: "2099-12-31"
      });
      if (!home.ok || !report.ok) throw new Error("Reconciliation unavailable");
      return {
        homeCash: home.value.cashInDrawerMinor,
        reportCash: report.value.totals.cashExpectedMinor,
        payable: report.value.payables.find((row) => row.supplierId === supplierId)?.balanceMinor
      };
    }, supplierId);
    expect(reconciliation).toEqual({
      homeCash: closingCash,
      reportCash: closingCash,
      payable: sold.balance
    });
    await page.getByLabel("Counted cash", { exact: true }).fill(String(closingCash / 100));
    await expect(page.locator(".counter-variance")).toContainText("Cash matches");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Close Counter", exact: true }).click();
    await expect(page.getByText("Counter is closed", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Counter is closed", { exact: true })).toBeVisible();
    expect(await snapshot()).toEqual({ ...sold, cash: closingCash });
  } finally {
    await app.close();
  }
});
