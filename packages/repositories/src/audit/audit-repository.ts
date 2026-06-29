import { auditLogs } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class AuditRepository extends BaseRepository<typeof auditLogs> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: auditLogs,
      tableName: "audit_logs",
      searchableColumns: [auditLogs.action, auditLogs.targetType, auditLogs.reason],
      dateColumn: auditLogs.occurredAt,
      sortableColumns: {
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        occurredAt: auditLogs.occurredAt,
        createdAt: auditLogs.createdAt
      }
    });
  }
}
