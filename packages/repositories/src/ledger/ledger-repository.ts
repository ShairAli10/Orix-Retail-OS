import { ledgerTransactions } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class LedgerRepository extends BaseRepository<typeof ledgerTransactions> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: ledgerTransactions,
      tableName: "ledger_transactions",
      searchableColumns: [ledgerTransactions.sourceType, ledgerTransactions.memo],
      dateColumn: ledgerTransactions.postedAt,
      sortableColumns: {
        sourceType: ledgerTransactions.sourceType,
        transactionType: ledgerTransactions.transactionType,
        postedAt: ledgerTransactions.postedAt,
        status: ledgerTransactions.status
      }
    });
  }
}
