import { suppliers } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class SupplierRepository extends BaseRepository<typeof suppliers> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: suppliers,
      tableName: "suppliers",
      searchableColumns: [suppliers.name, suppliers.phone, suppliers.email],
      dateColumn: suppliers.createdAt,
      sortableColumns: {
        name: suppliers.name,
        createdAt: suppliers.createdAt,
        status: suppliers.status
      }
    });
  }
}
