import type Database from "better-sqlite3";

export type RecommendedPragmaOptions = {
  readonly enableWal: boolean;
  readonly busyTimeoutMs: number;
};

export const applyRecommendedPragmas = (
  sqlite: Database.Database,
  options: RecommendedPragmaOptions
): void => {
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma(`busy_timeout = ${String(options.busyTimeoutMs)}`);

  if (options.enableWal) {
    sqlite.pragma("journal_mode = WAL");
  }
};
