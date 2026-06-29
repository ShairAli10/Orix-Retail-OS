import { products } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class ProductRepository extends BaseRepository<typeof products> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: products,
      tableName: "products",
      searchableColumns: [products.name, products.sku, products.barcode],
      dateColumn: products.createdAt,
      sortableColumns: {
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        createdAt: products.createdAt,
        status: products.status
      }
    });
  }
}
