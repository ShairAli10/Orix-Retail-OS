import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("seeds an isolated store that can be reopened without duplicating stock or sales", () => {
  const directory = mkdtempSync(join(tmpdir(), "orix-demo-test-"));
  try {
    const run = () =>
      spawnSync(process.execPath, ["scripts/seed-demo.mjs", "--directory", directory], {
        encoding: "utf8"
      });
    const first = run();
    expect(first.status, first.stderr).toBe(0);
    const second = run();
    expect(second.status, second.stderr).toBe(0);
    const result = JSON.parse(second.stdout.trim());
    expect(result.products).toBe(600);
    expect(result.customers).toBe(12);
    expect(result.suppliers).toBe(4);
    expect(result.ownerLogin).toBe(true);
    expect(result.cashierLogin).toBe(true);
    expect(result.sales).toBe(3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30_000);
