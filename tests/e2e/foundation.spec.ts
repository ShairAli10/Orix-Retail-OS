import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve, join } from "node:path";
import { copyFileSync, readFileSync } from "node:fs";

test("owner can reconcile the counter and recover a checkout basket", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Run pnpm test:e2e for an isolated seeded profile.");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [resolve("apps/desktop"), "--demo"],
    env,
    timeout: 10000
  });
  try {
    const page = await app.firstWindow({ timeout: 10000 });
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByRole("button", { name: "Counter & Expenses", exact: true }).click();
    await expect(page.getByText("Counter is open", { exact: true })).toBeVisible();
    await page.getByLabel("Expense description").fill("Test delivery charge");
    await page.getByLabel("Expense amount").fill("5");
    await page.getByRole("button", { name: "Record Expense", exact: true }).click();
    await expect(page.getByText("Test delivery charge", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Items", exact: true }).click();
    await page.getByRole("button", { name: "Add Item", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add Item", exact: true });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(
      true
    );
    await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(
      true
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Sell", exact: true }).click();
    const barcode = page.getByRole("textbox", { name: "Scan barcode", exact: true });
    await barcode.fill("9900000000600");
    await barcode.press("Enter");
    await expect(page.locator(".cart-lines")).toContainText("600");
    await page.getByRole("button", { name: "Items", exact: true }).click();
    await page.getByRole("button", { name: "Sell", exact: true }).click();
    await expect(page.locator(".cart-lines")).toContainText("600");
    await page.reload();
    await expect(page.locator(".cart-lines")).toContainText("600");
    await expect(page.getByRole("button", { name: "Complete Sale", exact: true })).toBeInViewport();
    await page.screenshot({ path: "test-results/counter-checkout.png", fullPage: true });
    await page.getByRole("button", { name: "Exact", exact: true }).click();
    await page.getByRole("button", { name: "Complete Sale", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Sale", exact: true }).click();
    await expect(page.getByText("Cart is empty", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByRole("button", { name: "New Sale", exact: true })).toBeInViewport();
    await page.getByRole("button", { name: "New Sale", exact: true }).click();
    await expect(barcode).toBeFocused();
    await expect(page.getByRole("button", { name: "Complete Sale", exact: true })).toBeInViewport();
    await expect(page.locator(".pos-change-row")).toBeInViewport();
    await page.screenshot({ path: "test-results/counter-1024.png", fullPage: true });
    const diagnosticsPath = join(process.env.ORIX_DEMO_DIRECTORY ?? "", "support.zip");
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath });
    }, diagnosticsPath);
    await page.evaluate(() => {
      window.dispatchEvent(
        new ErrorEvent("error", { error: new Error("PRIVATE_CUSTOMER_AND_PASSWORD") })
      );
    });
    await page.getByRole("button", { name: "Settings", exact: true }).first().click();
    await page.getByRole("tab", { name: "Support", exact: true }).click();
    await expect(page.getByRole("button", { name: "Export Diagnostics", exact: true })).toBeVisible(
      { timeout: 5000 }
    );
    await page.getByRole("button", { name: "Export Diagnostics", exact: true }).click();
    await expect(
      page.getByText("Diagnostics exported. Share the ZIP with your support contact.", {
        exact: true
      })
    ).toBeVisible();
    copyFileSync(diagnosticsPath, "test-results/diagnostics-export.zip");
    const archive = readFileSync(diagnosticsPath).toString();
    expect(archive).toContain("renderer-error");
    expect(archive).toContain("buildId");
    expect(archive).not.toContain("PRIVATE_CUSTOMER_AND_PASSWORD");
    await app.evaluate(({ dialog }) => {
      dialog.showSaveDialog = async () => ({ canceled: true, filePath: undefined });
    });
    await page.getByRole("button", { name: "Export Diagnostics", exact: true }).click();
    await expect(page.getByText("Export cancelled.", { exact: true })).toBeVisible();
    await app.evaluate(
      ({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath });
      },
      join(process.env.ORIX_DEMO_DIRECTORY ?? "", "missing-folder", "support.zip")
    );
    await page.getByRole("button", { name: "Export Diagnostics", exact: true }).click();
    await expect(
      page.getByText("Diagnostics could not be exported. Choose a writable folder and try again.", {
        exact: true
      })
    ).toBeVisible();
    await page.screenshot({ path: "test-results/diagnostics-support.png", fullPage: true });
  } finally {
    await app.close();
  }
});

test("forced process exit is reported on the next launch", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Run pnpm test:e2e");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const launch = () =>
    electron.launch({ args: [resolve("apps/desktop"), "--demo"], env, timeout: 10000 });
  const first = await launch();
  await first.firstWindow();
  const closed = first.waitForEvent("close");
  first.process().kill("SIGKILL");
  await closed;
  const second = await launch();
  try {
    const page = await second.firstWindow();
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByText(/Orix previously stopped unexpectedly/)).toBeVisible();
  } finally {
    await second.close();
  }
});

test("renderer crash is logged before the application exits", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Run pnpm test:e2e");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [resolve("apps/desktop"), "--demo"],
    env,
    timeout: 10000
  });
  await app.firstWindow();
  const closed = app.waitForEvent("close");
  await app.evaluate(({ BrowserWindow, dialog }) => {
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    setTimeout(() => BrowserWindow.getAllWindows()[0]?.webContents.forcefullyCrashRenderer(), 100);
  });
  await closed;
  const log = readFileSync(
    join(process.env.ORIX_DEMO_DIRECTORY ?? "", "diagnostics", "events-0.jsonl"),
    "utf8"
  );
  expect(log).toContain("renderer-crashed");
  expect(log).toContain("E_RENDERER_CRASH");
});
