import { expenses } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class ExpenseRepository extends BaseRepository<typeof expenses> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: expenses,
      tableName: "expenses",
      searchableColumns: [expenses.expenseNumber, expenses.description, expenses.notes],
      documentNumberColumn: expenses.expenseNumber,
      dateColumn: expenses.expenseDate,
      sortableColumns: {
        expenseNumber: expenses.expenseNumber,
        expenseDate: expenses.expenseDate,
        createdAt: expenses.createdAt,
        status: expenses.status,
        amountMinor: expenses.amountMinor
      }
    });
  }
}
