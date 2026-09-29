import { afterEach, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createDatabaseConnection, type DatabaseConnection } from "@orix/database";
import { migrateWithSafetyBackup } from "./upgrade.js";
const directories: string[] = [];
const connections: DatabaseConnection[] = [];
afterEach(() => {
  for (const db of connections.splice(0)) db.close();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), "orix-upgrade-"));
  directories.push(root);
  mkdirSync(join(root, "migrations", "meta"), { recursive: true });
  const first = "CREATE TABLE proof(value TEXT);";
  writeFileSync(join(root, "migrations", "0000.sql"), first);
  writeFileSync(join(root, "migrations", "0001.sql"), "ALTER TABLE proof ADD COLUMN extra TEXT;");
  writeFileSync(
    join(root, "migrations", "meta", "_journal.json"),
    JSON.stringify({
      entries: [
        { tag: "0000", when: 1 },
        { tag: "0001", when: 2 }
      ]
    })
  );
  const db = createDatabaseConnection({ filePath: join(root, "store.sqlite") });
  connections.push(db);
  db.sqlite.exec(
    "CREATE TABLE __drizzle_migrations(id INTEGER PRIMARY KEY,hash TEXT,created_at INTEGER);CREATE TABLE proof(value TEXT);INSERT INTO proof VALUES ('keep this')"
  );
  db.sqlite
    .prepare("INSERT INTO __drizzle_migrations(hash,created_at) VALUES (?,1)")
    .run(createHash("sha256").update(first).digest("hex"));
  return { root, db, folder: join(root, "migrations") };
};
it("backs up existing records before invoking a pending database upgrade", async () => {
  const { root, db, folder } = fixture();
  await migrateWithSafetyBackup(db, folder, root, () => {
    expect(readdirSync(join(root, "upgrade-backups")).length).toBe(1);
    db.sqlite.exec("ALTER TABLE proof ADD COLUMN extra TEXT");
  });
  const backup = createDatabaseConnection({
    filePath: join(
      root,
      "upgrade-backups",
      readdirSync(join(root, "upgrade-backups"))[0] ?? "missing"
    )
  });
  connections.push(backup);
  expect(backup.sqlite.prepare("SELECT * FROM proof").get()).toEqual({ value: "keep this" });
});
it("does not run a migration if backup creation fails or the stored schema is newer", async () => {
  const { root, db, folder } = fixture();
  writeFileSync(join(root, "upgrade-backups"), "blocked");
  let ran = false;
  await expect(
    migrateWithSafetyBackup(db, folder, root, () => {
      ran = true;
    })
  ).rejects.toThrow();
  expect(ran).toBe(false);
  db.sqlite.prepare("INSERT INTO __drizzle_migrations(hash,created_at) VALUES (?,3)").run("newer");
  await expect(
    migrateWithSafetyBackup(db, folder, root, () => {
      ran = true;
    })
  ).rejects.toThrow();
  expect(ran).toBe(false);
  expect(readFileSync(join(root, "upgrade-backups"), "utf8")).toBe("blocked");
});
