import { createHash, randomUUID } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseConnection } from "@orix/database";
export const migrateWithSafetyBackup = async (
  connection: DatabaseConnection,
  migrationsFolder: string,
  userData: string,
  migrate: () => void
): Promise<void> => {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8")
  ) as { entries: { tag: string; when: number }[] };
  const hasHistory = connection.sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
    .get();
  const stored = hasHistory
    ? (connection.sqlite
        .prepare("SELECT hash,created_at FROM __drizzle_migrations ORDER BY created_at")
        .all() as { hash: string; created_at: number }[])
    : [];
  for (let i = 0; i < stored.length; i++) {
    const expected = journal.entries[i];
    const actual = stored[i];
    if (
      expected === undefined ||
      actual?.created_at !== expected.when ||
      actual.hash !==
        createHash("sha256")
          .update(readFileSync(join(migrationsFolder, `${expected.tag}.sql`)))
          .digest("hex")
    )
      throw new Error(
        "Database version is newer or incompatible. Do not downgrade this installation."
      );
  }
  if (stored.length < journal.entries.length) {
    const hasData = connection.sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 1"
      )
      .get();
    if (hasData) {
      const directory = join(userData, "upgrade-backups");
      mkdirSync(directory, { recursive: true });
      await connection.sqlite.backup(
        join(directory, `before-upgrade-${String(Date.now())}-${randomUUID()}.sqlite`)
      );
    }
    migrate();
  }
};
