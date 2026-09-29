import { test as base, expect } from "@playwright/test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Every journey starts from the same seed; closing a day or returning stock in
// one test must not change the starting conditions for the next journey.
export const test = base.extend<{ isolatedProfile: void }>({
  isolatedProfile: [
    async ({}, use) => {
      const seed = process.env.ORIX_DEMO_DIRECTORY;
      if (!seed) {
        await use();
        return;
      }
      const profile = mkdtempSync(join(tmpdir(), "orix-journey-"));
      try {
        cpSync(seed, profile, { recursive: true });
        process.env.ORIX_DEMO_DIRECTORY = profile;
        await use();
      } finally {
        process.env.ORIX_DEMO_DIRECTORY = seed;
        rmSync(profile, { recursive: true, force: true });
      }
    },
    { auto: true }
  ]
});
export { expect };
