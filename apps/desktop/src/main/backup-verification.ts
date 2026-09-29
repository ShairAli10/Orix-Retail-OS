import { createDatabaseConnection, runMigrations } from "@orix/database";
import {
  verificationFailed,
  verificationOk,
  type BackupVerificationResult
} from "./backup-utils.js";

export const verifyDatabaseBackup = (
  filePath: string,
  migrationsFolder: string
): BackupVerificationResult => {
  let source: ReturnType<typeof createDatabaseConnection> | undefined;
  let expected: ReturnType<typeof createDatabaseConnection> | undefined;
  try {
    source = createDatabaseConnection({ filePath, mode: "readonly", enableWal: false });
    if (
      source.sqlite.pragma("integrity_check", { simple: true }) !== "ok" ||
      (source.sqlite.pragma("foreign_key_check") as unknown[]).length !== 0
    )
      return verificationFailed("Database integrity checks failed.");
    expected = createDatabaseConnection({ filePath: ":memory:", enableWal: false });
    runMigrations(expected, { migrationsFolder });
    type Table = { name: string };
    type Column = { name: string; type: string; notnull: number; pk: number };
    const tables = expected.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as Table[];
    for (const table of tables) {
      const quote = table.name.replaceAll('"', '""');
      const columns = (connection: typeof source) =>
        (connection?.sqlite.prepare(`PRAGMA table_info("${quote}")`).all() as Column[]).map((c) => [
          c.name,
          c.type,
          c.notnull,
          c.pk
        ]);
      if (JSON.stringify(columns(expected)) !== JSON.stringify(columns(source)))
        return verificationFailed("Backup schema is incomplete or incompatible with this version.");
    }
    const schema =
      "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY type,name";
    if (
      JSON.stringify(source.sqlite.prepare(schema).all()) !==
      JSON.stringify(expected.sqlite.prepare(schema).all())
    )
      return verificationFailed(
        "Backup constraints, indexes or triggers do not match this application version."
      );
    const migrations = "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at";
    if (
      JSON.stringify(source.sqlite.prepare(migrations).all()) !==
      JSON.stringify(expected.sqlite.prepare(migrations).all())
    )
      return verificationFailed("Backup migration version is not supported by this application.");
    const store = source.sqlite.prepare("SELECT COUNT(*) count FROM stores").get() as {
      count: number;
    };
    const users = source.sqlite
      .prepare("SELECT COUNT(*) count FROM users WHERE status = 'active'")
      .get() as { count: number };
    if (store.count !== 1 || users.count < 1)
      return verificationFailed("Backup does not contain a usable single-store installation.");
    return verificationOk("Backup structure, migration version and database integrity are valid.");
  } catch {
    return verificationFailed("Backup could not be opened as a compatible Orix database.");
  } finally {
    source?.close();
    expected?.close();
  }
};
