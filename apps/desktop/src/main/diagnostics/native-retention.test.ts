import { expect, it } from "vitest";
import { mkdtempSync, writeFileSync, readdirSync, rmSync, mkdirSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pruneNativeDumps } from "./native-retention.js";
it("limits crash dumps by age and count without deleting unrelated files", () => {
  const dir = mkdtempSync(join(tmpdir(), "orix-dumps-"));
  mkdirSync(join(dir, "reports"));
  try {
    for (let i = 0; i < 8; i++) {
      const path = join(dir, "reports", `${String(i)}.dmp`);
      writeFileSync(path, "memory");
      utimesSync(path, new Date(), new Date(Date.now() - i * 1000));
    }
    const old = join(dir, "reports", "old.dmp");
    writeFileSync(old, "old");
    utimesSync(old, new Date(0), new Date(0));
    writeFileSync(join(dir, "config"), "keep");
    pruneNativeDumps(dir);
    expect(readdirSync(join(dir, "reports")).sort()).toEqual([
      "0.dmp",
      "1.dmp",
      "2.dmp",
      "3.dmp",
      "4.dmp"
    ]);
    expect(readdirSync(dir)).toContain("config");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
