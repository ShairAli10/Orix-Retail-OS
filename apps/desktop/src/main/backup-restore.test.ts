import { afterEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDatabaseConnection } from "@orix/database";
import { stageDatabaseRestore, replaceWithStagedRestore } from "./backup-restore.js";
const dirs: string[] = [];
const directory = () => {
  const dir = mkdtempSync(join(tmpdir(), "orix-restore-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
it("stages a consistent snapshot including committed WAL data before replacing the live file", async () => {
  const dir = directory();
  const source = join(dir, "source.sqlite");
  const live = join(dir, "live.sqlite");
  const db = createDatabaseConnection({ filePath: source });
  try {
    db.sqlite.exec("CREATE TABLE proof(value TEXT); INSERT INTO proof VALUES ('committed in WAL')");
    writeFileSync(live, "original");
    const staged = await stageDatabaseRestore(source, live, () => true);
    expect(readFileSync(live, "utf8")).toBe("original");
    await replaceWithStagedRestore(staged, live);
    const restored = createDatabaseConnection({ filePath: live });
    try {
      expect(restored.sqlite.prepare("SELECT value FROM proof").get()).toEqual({
        value: "committed in WAL"
      });
    } finally {
      restored.close();
    }
  } finally {
    db.close();
  }
});
it("verification and rename failures preserve the previous database", async () => {
  const dir = directory();
  const source = join(dir, "source.sqlite");
  const live = join(dir, "live.sqlite");
  const db = createDatabaseConnection({ filePath: source });
  db.sqlite.exec("CREATE TABLE proof(value TEXT)");
  db.close();
  writeFileSync(live, "original");
  await expect(stageDatabaseRestore(source, live, () => false)).rejects.toThrow();
  expect(readFileSync(live, "utf8")).toBe("original");
  await expect(replaceWithStagedRestore(join(dir, "missing.sqlite"), live)).rejects.toThrow();
  expect(readFileSync(live, "utf8")).toBe("original");
});
