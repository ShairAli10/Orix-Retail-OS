import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";

test("all workspace layouts fit counter windows and detail drawers", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Run pnpm test:e2e");
  test.setTimeout(120000);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [resolve("apps/desktop"), "--demo"], env });
  try {
    const page = await app.firstWindow();
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.locator(".sidebar")).toBeVisible();
    const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
    await page.addStyleTag({
      content: "*, *::before, *::after { transition: none !important; animation: none !important; }"
    });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      for (const width of [1440, 1280, 1024, 800]) {
        await page.setViewportSize({ width, height: 768 });
        for (const route of [
          "Home",
          "Items",
          "Stock",
          "Customer Book",
          "Suppliers",
          "Buy Stock",
          "Sales History",
          "Counter & Expenses",
          "Reports",
          "Settings",
          "About"
        ]) {
          await page.locator(".sidebar").getByRole("button", { name: route, exact: true }).click();
          await expect(page.locator(".loading-state")).toHaveCount(0);
          await expect(page.locator(".main-content")).not.toContainText("Something went wrong");
          await expect
            .poll(
              () =>
                page
                  .locator(".main-content")
                  .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
              { message: `${route} at ${width}: page overflow` }
            )
            .toBe(true);
          const metrics = page.locator(".metric-card strong");
          await expect
            .poll(
              () =>
                metrics.evaluateAll((elements) =>
                  elements.every((el) => el.scrollWidth <= el.clientWidth + 1)
                ),
              { message: `${route} at ${width}: clipped metrics` }
            )
            .toBe(true);
          if (["Stock", "Reports", "Settings"].includes(route))
            await page.screenshot({ path: `test-results/layout-${theme}-${route}-${width}.png` });
        }
      }
    }
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Sales History", exact: true })
      .click();
    await page.getByRole("button", { name: "View details", exact: true }).first().click();
    const drawer = page.locator(".drawer");
    await expect(drawer).toBeVisible();
    expect(
      await drawer.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
      })
    ).toBe(true);
    await page.screenshot({ path: "test-results/layout-sale-drawer.png" });
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    for (const route of ["Customer Book", "Suppliers"]) {
      await page.locator(".sidebar").getByRole("button", { name: route, exact: true }).click();
      await page.locator(".customer-table tbody tr").first().dblclick();
      await expect(drawer).toBeVisible();
      await drawer.getByRole("button", { name: "Activity", exact: true }).click();
      await expect(drawer.locator(".activity-item").first()).toBeVisible();
      await expect(drawer.locator(".activity-list")).not.toContainText(/\{[\s\S]*"[a-zA-Z]+"\s*:/);
      expect(await drawer.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await drawer.getByRole("button", { name: "Close", exact: true }).click();
    }

    for (const [route, action] of [
      ["Items", "Add Item"],
      ["Customer Book", "New Customer"],
      ["Suppliers", "New Supplier"],
      ["Buy Stock", "New Purchase"],
      ["Stock", "Opening Stock"],
      ["Stock", "Adjust Stock"]
    ]) {
      await page.locator(".sidebar").getByRole("button", { name: route!, exact: true }).click();
      await page.getByRole("button", { name: action!, exact: true }).click();
      const modal = page.locator(".modal").last();
      await expect(modal).toBeVisible();
      expect(
        await modal.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${action}: horizontal overflow`
      ).toBe(true);
      await page.screenshot({ path: `test-results/layout-dialog-${action}.png` });
      const closeButton = modal.locator("header button").last();
      const beforeHover = await closeButton.boundingBox();
      await closeButton.hover();
      expect(await closeButton.boundingBox(), `${action}: hover moved the close target`).toEqual(
        beforeHover
      );
      await closeButton.click();
    }
  } finally {
    await app.close();
  }
});
