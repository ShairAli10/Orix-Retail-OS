import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
it("enforces desktop security and financial invariants against real SQLite", () => {
  const dir = mkdtempSync(join(tmpdir(), "orix-regression-"));
  try {
    const seed = spawnSync(process.execPath, ["scripts/seed-demo.mjs", "--directory", dir], {
      encoding: "utf8"
    });
    expect(seed.status, seed.stderr).toBe(0);
    const result = spawnSync(process.execPath, ["--test", "scripts/desktop-regressions.mjs"], {
      encoding: "utf8",
      env: { ...process.env, ORIX_TEST_DIRECTORY: dir }
    });
    expect(result.status, result.stdout + "\n" + result.stderr).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
