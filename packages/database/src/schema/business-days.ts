import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import {
  createdAt,
  moneyColumn,
  requiredUuidColumn,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const businessDays = sqliteTable(
  "business_days",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDate: text("business_date").notNull(),
    status: text("status").notNull().default("open"),
    openedAt: timestampColumn("opened_at"),
    openedByUserId: requiredUuidColumn("opened_by_user_id").references(() => users.id),
    closedAt: timestampColumn("closed_at"),
    closedByUserId: uuidColumn("closed_by_user_id").references(() => users.id),
    expectedCashMinor: moneyColumn("expected_cash_minor"),
    countedCashMinor: moneyColumn("counted_cash_minor"),
    cashVarianceMinor: moneyColumn("cash_variance_minor"),
    notes: text("notes"),
    createdAt: createdAt()
  },
  (table) => ({
    branchDateUnique: uniqueIndex("business_days_branch_date_unique").on(
      table.branchId,
      table.businessDate
    ),
    branchStatusIdx: index("business_days_branch_status_idx").on(table.branchId, table.status),
    businessDateIdx: index("business_days_business_date_idx").on(table.businessDate),
    openedAtIdx: index("business_days_opened_at_idx").on(table.openedAt),
    closedAtIdx: index("business_days_closed_at_idx").on(table.closedAt)
  })
);
