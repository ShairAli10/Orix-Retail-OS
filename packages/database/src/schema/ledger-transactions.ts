import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import {
  createdAt,
  requiredTimestampColumn,
  requiredUuidColumn,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const ledgerTransactions = sqliteTable(
  "ledger_transactions",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    sourceType: text("source_type").notNull(),
    sourceId: requiredUuidColumn("source_id"),
    transactionType: text("transaction_type").notNull(),
    status: text("status").notNull().default("posted"),
    postedAt: requiredTimestampColumn("posted_at"),
    postedByUserId: requiredUuidColumn("posted_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id),
    reversedAt: timestampColumn("reversed_at"),
    reversalOfLedgerTransactionId: uuidColumn("reversal_of_ledger_transaction_id"),
    memo: text("memo"),
    createdAt: createdAt()
  },
  (table) => ({
    sourceUnique: uniqueIndex("ledger_transactions_source_unique").on(
      table.sourceType,
      table.sourceId,
      table.transactionType
    ),
    sourceIdx: index("ledger_transactions_source_idx").on(table.sourceType, table.sourceId),
    businessDayPostedIdx: index("ledger_transactions_day_posted_idx").on(
      table.businessDayId,
      table.postedAt
    ),
    typePostedIdx: index("ledger_transactions_type_posted_idx").on(
      table.transactionType,
      table.postedAt
    ),
    statusIdx: index("ledger_transactions_status_idx").on(table.status)
  })
);
