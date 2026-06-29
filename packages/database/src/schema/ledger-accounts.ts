import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, requiredUuidColumn, updatedAt, uuidColumn, uuidPrimaryKey } from "./shared.js";
import { stores } from "./stores.js";

export const ledgerAccounts = sqliteTable(
  "ledger_accounts",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    accountType: text("account_type").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storeCodeUnique: uniqueIndex("ledger_accounts_store_code_unique").on(table.storeId, table.code),
    storeStatusIdx: index("ledger_accounts_store_status_idx").on(table.storeId, table.status),
    typeIdx: index("ledger_accounts_type_idx").on(table.accountType)
  })
);
