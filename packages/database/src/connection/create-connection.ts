import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { applyRecommendedPragmas } from "./pragmas.js";
import type { DatabaseConnection, SqliteConnectionOptions } from "./types.js";

const DEFAULT_BUSY_TIMEOUT_MS = 5_000;

export const createDatabaseConnection = (options: SqliteConnectionOptions): DatabaseConnection => {
  const sqlite = new Database(options.filePath, {
    readonly: options.mode === "readonly",
    fileMustExist: options.mode === "readonly"
  });

  applyRecommendedPragmas(sqlite, {
    enableWal: options.enableWal ?? true,
    busyTimeoutMs: options.busyTimeoutMs ?? DEFAULT_BUSY_TIMEOUT_MS
  });

  return {
    sqlite,
    drizzle: drizzle(sqlite),
    close: () => {
      sqlite.close();
    }
  };
};
