import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import {
  archivedAt,
  createdAt,
  requiredUuidColumn,
  timestampColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const cashAccounts = sqliteTable(
  "cash_accounts",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    name: text("name").notNull(),
    accountType: text("account_type").notNull().default("cash_drawer"),
    status: text("status").notNull().default("active"),
    currencyCode: text("currency_code").notNull().default("PKR"),
    openedAt: timestampColumn("opened_at"),
    closedAt: timestampColumn("closed_at"),
    closedByUserId: uuidColumn("closed_by_user_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id").references(() => users.id),
    updatedByUserId: uuidColumn("updated_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchNameUnique: uniqueIndex("cash_accounts_branch_name_unique").on(
      table.branchId,
      table.name
    ),
    branchStatusIdx: index("cash_accounts_branch_status_idx").on(table.branchId, table.status),
    accountTypeIdx: index("cash_accounts_type_idx").on(table.accountType)
  })
);
