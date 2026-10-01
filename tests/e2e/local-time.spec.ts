import { _electron as electron } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import { resolve } from "node:path";

test("new forms use local calendar dates and wall time after midnight", async () => {
  test.skip(!process.env.ORIX_DEMO_DIRECTORY, "Use isolated demo runner");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [resolve("apps/desktop"), "--demo"], env });
  try {
    const page = await app.firstWindow();
    await page.getByLabel("Username", { exact: true }).fill("owner");
    await page.locator("input[type=password]").fill("DemoOwner!2026");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.locator(".sidebar")).toBeVisible();
    // Local constructor deliberately avoids a UTC fixture. Set it after startup
    // to also catch module-level defaults that go stale when the date changes.
    const instant = await page.evaluate(() => new Date(2027, 0, 1, 0, 15).getTime());
    await page.clock.setFixedTime(instant);
    for (const [route, action] of [
      ["Customer Book", "New Customer"],
      ["Suppliers", "New Supplier"],
      ["Buy Stock", "New Purchase"],
      ["Stock", "Opening Stock"],
      ["Stock", "Adjust Stock"]
    ] as const) {
      await page.locator(".sidebar").getByRole("button", { name: route, exact: true }).click();
      await page.getByRole("button", { name: action, exact: true }).click();
      const dialog = page.locator(".modal").last();
      await expect(dialog, `${action} opens`).toBeVisible();
      const inputs = dialog.locator('input[type="date"], input[type="datetime-local"]');
      expect(await inputs.count()).toBeGreaterThan(0);
      await expect(inputs.first()).not.toHaveValue("");
      for (const input of await inputs.all()) {
        const value = await input.inputValue();
        if (!value) continue; // Optional due date can be empty.
        const type = await input.getAttribute("type");
        expect(value).toBe(type === "date" ? "2027-01-01" : "2027-01-01T00:15");
      }
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await expect(dialog).not.toBeVisible();
    }
  } finally {
    await app.close();
  }
});
