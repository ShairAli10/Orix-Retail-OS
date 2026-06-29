import { purchases } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class PurchaseRepository extends BaseRepository<typeof purchases> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: purchases,
      tableName: "purchases",
      searchableColumns: [purchases.purchaseNumber],
      documentNumberColumn: purchases.purchaseNumber,
      dateColumn: purchases.purchaseDate,
      sortableColumns: {
        purchaseNumber: purchases.purchaseNumber,
        purchaseDate: purchases.purchaseDate,
        createdAt: purchases.createdAt,
        status: purchases.status,
        totalMinor: purchases.totalMinor
      }
    });
  }
}
