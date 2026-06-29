import { settings } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class SettingsRepository extends BaseRepository<typeof settings> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: settings,
      tableName: "settings",
      searchableColumns: [settings.key, settings.category],
      dateColumn: settings.effectiveAt,
      sortableColumns: {
        key: settings.key,
        category: settings.category,
        effectiveAt: settings.effectiveAt,
        createdAt: settings.createdAt
      }
    });
  }
}
