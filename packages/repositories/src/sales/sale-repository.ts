import { sales } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class SaleRepository extends BaseRepository<typeof sales> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: sales,
      tableName: "sales",
      searchableColumns: [sales.saleNumber],
      documentNumberColumn: sales.saleNumber,
      dateColumn: sales.saleDate,
      sortableColumns: {
        saleNumber: sales.saleNumber,
        saleDate: sales.saleDate,
        createdAt: sales.createdAt,
        status: sales.status,
        totalMinor: sales.totalMinor
      }
    });
  }
}
