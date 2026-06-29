import { customers } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class CustomerRepository extends BaseRepository<typeof customers> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: customers,
      tableName: "customers",
      searchableColumns: [customers.name, customers.phone, customers.email],
      dateColumn: customers.createdAt,
      sortableColumns: {
        name: customers.name,
        createdAt: customers.createdAt,
        status: customers.status
      }
    });
  }
}
