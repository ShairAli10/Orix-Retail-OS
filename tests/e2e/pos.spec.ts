import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";
test("POS holds, resumes and completes a basket at desktop widths", async () => {
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
    await page.locator(".sidebar").getByRole("button", { name: "Sell", exact: true }).click();
    const barcode = page.getByRole("textbox", { name: "Scan barcode", exact: true });
    await barcode.fill("9900000000600");
    await barcode.press("Enter");
    await expect(page.locator(".cart-lines")).toContainText("600");
    await page.getByRole("button", { name: "Hold", exact: true }).click();
    await expect(page.getByText("Cart is empty", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: /^Held/ }).click();
    const held = page.getByRole("dialog", { name: "Held sales", exact: true });
    await expect(held).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(held).not.toBeVisible();
    await page.getByRole("button", { name: /^Held/ }).click();
    await held.getByRole("button", { name: "Resume", exact: true }).first().click();
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 768 });
      await expect(
        page.getByRole("button", { name: "Complete Sale", exact: true })
      ).toBeInViewport();
      await page.screenshot({ path: `test-results/pos-${width}.png` });
    }
    await page.getByRole("button", { name: "Exact", exact: true }).click();
    await page.getByRole("button", { name: "Complete Sale", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Sale", exact: true }).click();
    await expect(page.getByText("Cart is empty", { exact: true })).toBeVisible();
  } finally {
    await app.close();
  }
});

test("POS customer search exposes matches and preserves selection on no results", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Use isolated demo runner");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [resolve("apps/desktop"), "--demo"], env });
  try {
    const page = await app.firstWindow();
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.locator(".sidebar").getByRole("button", { name: "Sell", exact: true }).click();
    page.setDefaultTimeout(5000);
    const search = page.getByRole("combobox", { name: "Customer", exact: true });
    await expect(search).toHaveValue("Walk-in Customer");
    await search.fill("Demo Customer 11");
    const matches = page.getByRole("listbox", { name: "Customer", exact: true });
    await expect(matches).toBeVisible();
    await expect(
      matches.getByRole("option", { name: "Demo Customer 11", exact: true })
    ).toHaveCount(1);
    await matches.getByRole("option", { name: "Demo Customer 11", exact: true }).click();
    await expect(search).toHaveValue("Demo Customer 11");
    await expect(matches).not.toBeVisible();
    await search.fill("NoSuchCustomerxyz");
    await expect(
      page.getByText("No customers found. Try another name or phone.", { exact: true })
    ).toBeVisible();
    await search.press("Escape");
    await expect(search).toHaveValue("Demo Customer 11");
    await search.click();
    await matches.getByRole("option", { name: "Walk-in Customer", exact: true }).click();
    await expect(search).toHaveValue("Walk-in Customer");
    const add = page.getByRole("button", { name: "Add scanned item", exact: true });
    await expect(add.locator("svg")).toBeVisible();
    await expect(add).toBeDisabled();
    await page.getByRole("textbox", { name: "Scan barcode", exact: true }).fill("9900000000600");
    await add.click();
    await expect(page.locator(".cart-lines")).toContainText("600");
    await page.setViewportSize({ width: 800, height: 768 });
    await search.fill("Demo");
    await expect(matches).toBeVisible();
    await expect(matches).toBeEnabled();
    await expect(matches.getByRole("option")).toHaveCount(13);
    await search.press("ArrowDown");
    await expect(search).toBeFocused();
    await search.press("Enter");
    await expect(search).toHaveValue("Walk-in Customer");
    await search.fill("Demo");
    await expect(matches.getByRole("option")).toHaveCount(13);
    await page.screenshot({ path: "test-results/pos-customer-search-800.png" });
  } finally {
    await app.close();
  }
});
