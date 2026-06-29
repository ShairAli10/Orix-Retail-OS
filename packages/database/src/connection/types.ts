import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export type SqliteConnectionMode = "readonly" | "readwrite";

export type SqliteConnectionOptions = {
  readonly filePath: string;
  readonly mode?: SqliteConnectionMode;
  readonly enableWal?: boolean;
  readonly busyTimeoutMs?: number;
};

export type DatabaseConnection = {
  readonly sqlite: Database.Database;
  readonly drizzle: BetterSQLite3Database;
  readonly close: () => void;
};
