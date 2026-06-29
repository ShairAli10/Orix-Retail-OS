import { users } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class UserRepository extends BaseRepository<typeof users> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: users,
      tableName: "users",
      searchableColumns: [users.displayName, users.username],
      dateColumn: users.createdAt,
      sortableColumns: {
        displayName: users.displayName,
        username: users.username,
        createdAt: users.createdAt,
        status: users.status,
        lastLoginAt: users.lastLoginAt
      }
    });
  }
}
