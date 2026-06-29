import { expect, test } from "@playwright/test";

test("foundation test runner is configured", () => {
  expect("Orix Retail OS").toContain("Retail");
});
