import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

test("SQL review corrects drafts, posts verified stock and survives retry", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Use isolated demo runner");
  const directory = mkdtempSync(join(tmpdir(), "orix-source-"));
  const file = join(directory, "old-pos.sql");
  const extraItems = Array.from(
    { length: 28 },
    (_, i) => `(${i + 3},'Product ${i + 3}','CODE${i + 3}',100,150,1,0)`
  ).join(",");
  const extraStock = Array.from({ length: 28 }, (_, i) => `(${i + 3},1,5)`).join(",");
  writeFileSync(
    file,
    `SET time_zone = '+00:00';
INSERT INTO \`ospos_app_config\` (\`key\`,\`value\`) VALUES ('company','Source shop'),('currency_code','PKR');
INSERT INTO \`ospos_items\` (\`item_id\`,\`name\`,\`item_number\`,\`cost_price\`,\`unit_price\`,\`reorder_level\`,\`deleted\`) VALUES (1,'Import Tea','TEA',100,150,1,0),(2,'Import Coffee','TEA',100,150,1,0),${extraItems};
INSERT INTO \`ospos_item_quantities\` (\`item_id\`,\`location_id\`,\`quantity\`) VALUES (1,1,-5),(2,1,3),${extraStock};
INSERT INTO \`ospos_stock_locations\` (\`location_id\`,\`location_name\`,\`deleted\`) VALUES (1,'Store',0);
DROP TABLE products;`
  );
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [resolve("apps/desktop"), "--demo"], env });
  try {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
    }, file);
    await app.evaluate(({ app }, path) => {
      app.setPath("documents", path);
    }, directory);
    const page = await app.firstWindow();
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator('input[type="password"]').fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.locator(".sidebar").getByRole("button", { name: "Settings", exact: true }).click();
    const before = await page.evaluate(() => window.orix.inventory.overview());
    await page.getByRole("tab", { name: "Data & backup" }).click();
    await page.getByRole("button", { name: "Start import", exact: true }).click();
    await page.getByRole("button", { name: "Choose SQL file", exact: true }).click();
    await expect(page.getByText("Source shop", { exact: false })).toBeVisible();
    await expect(page.getByText("Opening stock cannot be negative.")).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: "Import Tea" });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Barcode", { exact: true }).fill("TEA-NEW");
    await page.getByLabel("Opening quantity", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Apply correction" }).click();
    await expect(page.getByText("Opening stock cannot be negative.")).toHaveCount(0);
    await expect(page.getByText("Barcode is also used by another included product.")).toHaveCount(
      0
    );
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByText("Save your review changes before closing?")).toBeVisible();
    await page.getByRole("button", { name: "Keep reviewing", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Product 30", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    for (const width of [1440, 800]) {
      await page.setViewportSize({ width, height: 768 });
      expect(
        await page.locator(".import-review").evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      await page.screenshot({ path: `test-results/import-review-${width}.png` });
    }
    await page.reload();
    // Login session survives renderer reload; saved review is restored only for matching source hash.
    await page.locator(".sidebar").getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Data & backup" }).click();
    await page.getByRole("button", { name: "Start import", exact: true }).click();
    await page.getByRole("button", { name: "Choose SQL file", exact: true }).click();
    await expect(page.getByText(/TEA-NEW/)).toBeVisible();
    await expect(page.getByText("Opening stock cannot be negative.")).toHaveCount(0);
    await page.getByRole("button", { name: "3. Review summary" }).click();
    await expect(page.getByRole("button", { name: "Create backup & import" })).toBeDisabled();
    expect(await page.evaluate(() => window.orix.inventory.overview())).toEqual(before);
    await page.getByRole("checkbox", { name: /I verified opening quantities/ }).check();
    await page.getByRole("button", { name: "Create backup & import" }).click();
    await expect(page.getByText("Last import completed", { exact: true })).toBeVisible();
    const imported = await page.evaluate(() => window.orix.migration.lastImport());
    expect(imported.ok).toBe(true);
    if (!imported.ok) throw new Error(imported.error.message);
    expect(imported.value?.createdProducts).toBe(30);
    expect(imported.value?.openingQuantity).toBe(148);
    expect(imported.value?.backupFile).toBeTruthy();
    const backups = await page.evaluate(() => window.orix.backups.status());
    expect(backups.ok).toBe(true);
    await page.screenshot({ path: "test-results/import-completed-800.png" });
    await page.reload();
    await page.locator(".sidebar").getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Data & backup" }).click();
    await expect(page.getByText("Last import completed", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start import", exact: true }).click();
    await page.getByRole("button", { name: "Choose SQL file", exact: true }).click();
    await page.getByRole("button", { name: "3. Review summary" }).click();
    await page.getByRole("checkbox", { name: /I verified opening quantities/ }).check();
    await page.getByRole("button", { name: "Create backup & import" }).click();
    await expect(page.getByText("Last import completed", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.orix.migration.lastImport())).toEqual(imported);
    await page.locator(".sidebar").getByRole("button", { name: "Items", exact: true }).click();
    await page
      .getByPlaceholder(/Search/)
      .first()
      .fill("Import Tea");
    await expect(page.getByText("Import Tea", { exact: true })).toBeVisible();
    await page.locator(".sidebar").getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Data & backup" }).click();
    await page.getByRole("button", { name: "Reset store data", exact: true }).click();
    const reset = page.getByRole("dialog", { name: "Reset store data", exact: true });
    await expect(reset.getByRole("button", { name: "Back up & clear store data" })).toBeDisabled();
    await reset.getByLabel("Owner password").fill("wrong-password");
    await reset.getByLabel("Type RESET STORE DATA").fill("RESET STORE DATA");
    await reset.getByRole("button", { name: "Back up & clear store data" }).click();
    await expect(reset.getByRole("alert")).toContainText("owner password");
    await reset.getByLabel("Owner password").fill("DemoOwner!2026");
    await reset.getByRole("button", { name: "Back up & clear store data" }).click();
    await expect(reset.getByRole("alert")).toContainText("Close the counter");
    const closed = await page.evaluate(async () => {
      const summary = await window.orix.counter.summary();
      if (!summary.ok) throw new Error("No summary");
      return window.orix.counter.close({
        countedCashMinor: summary.value.expectedCashMinor,
        reason: "Reset test store"
      });
    });
    expect(closed.ok).toBe(true);
    await reset.getByRole("button", { name: "Back up & clear store data" }).click();
    await expect(reset.getByRole("heading", { name: "Store data cleared" })).toBeVisible();
    await reset.getByRole("button", { name: "Reload Orix" }).click();
    const empty = await page.evaluate(() =>
      window.orix.products.list({
        page: 1,
        pageSize: 1,
        status: "all",
        sortBy: "name",
        sortDirection: "asc"
      })
    );
    expect(empty.ok && empty.value.totalItems).toBe(0);
    expect(await page.evaluate(() => window.orix.migration.lastImport())).toMatchObject({
      ok: true,
      value: null
    });
    const accounts = await page.evaluate(() =>
      window.orix.users.list({ search: "", status: "all" })
    );
    expect(accounts.ok && accounts.value.users.length).toBe(3);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
