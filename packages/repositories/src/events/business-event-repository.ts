import { businessEvents } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class BusinessEventRepository extends BaseRepository<typeof businessEvents> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: businessEvents,
      tableName: "business_events",
      searchableColumns: [businessEvents.eventName, businessEvents.sourceType],
      dateColumn: businessEvents.occurredAt,
      sortableColumns: {
        eventName: businessEvents.eventName,
        sourceType: businessEvents.sourceType,
        occurredAt: businessEvents.occurredAt,
        syncStatus: businessEvents.syncStatus
      }
    });
  }
}
