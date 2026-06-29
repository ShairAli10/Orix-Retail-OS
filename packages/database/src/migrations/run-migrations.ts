import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { DatabaseConnection } from "../connection/index.js";

export type MigrationRunnerOptions = {
  readonly migrationsFolder: string;
};

export const runMigrations = (
  connection: DatabaseConnection,
  options: MigrationRunnerOptions
): void => {
  migrate(connection.drizzle, {
    migrationsFolder: options.migrationsFolder
  });
};
