import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ledgerAccounts } from "./ledger-accounts.js";
import { ledgerTransactions } from "./ledger-transactions.js";
import {
  createdAt,
  debitOrCredit,
  requiredMoneyColumn,
  requiredUuidColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: uuidPrimaryKey(),
    ledgerTransactionId: requiredUuidColumn("ledger_transaction_id").references(
      () => ledgerTransactions.id
    ),
    ledgerAccountId: requiredUuidColumn("ledger_account_id").references(() => ledgerAccounts.id),
    entryType: text("entry_type").notNull(),
    accountType: text("account_type").notNull(),
    accountRefType: text("account_ref_type"),
    accountRefId: uuidColumn("account_ref_id"),
    debitMinor: requiredMoneyColumn("debit_minor").default(0),
    creditMinor: requiredMoneyColumn("credit_minor").default(0),
    currencyCode: text("currency_code").notNull().default("PKR"),
    memo: text("memo"),
    createdAt: createdAt()
  },
  (table) => ({
    transactionIdx: index("ledger_entries_transaction_idx").on(table.ledgerTransactionId),
    ledgerAccountIdx: index("ledger_entries_account_idx").on(table.ledgerAccountId),
    accountRefIdx: index("ledger_entries_account_ref_idx").on(
      table.accountType,
      table.accountRefId
    ),
    refCreatedIdx: index("ledger_entries_ref_created_idx").on(table.accountRefId, table.createdAt),
    accountCreatedIdx: index("ledger_entries_account_created_idx").on(
      table.accountType,
      table.createdAt
    ),
    debitOrCreditCheck: check(
      "ledger_entries_debit_or_credit",
      debitOrCredit("debit_minor", "credit_minor")
    )
  })
);
