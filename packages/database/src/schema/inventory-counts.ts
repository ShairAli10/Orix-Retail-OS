import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import {
  createdAt,
  requiredTimestampColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const inventoryCounts = sqliteTable(
  "inventory_counts",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    countNumber: text("count_number").notNull(),
    scopeType: text("scope_type").notNull().default("full"),
    status: text("status").notNull().default("draft"),
    startedAt: requiredTimestampColumn("started_at"),
    completedAt: text("completed_at"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: requiredUuidColumn("created_by_user_id").references(() => users.id),
    completedByUserId: uuidColumn("completed_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchCountNumberUnique: uniqueIndex("inventory_counts_branch_number_unique").on(
      table.branchId,
      table.countNumber
    ),
    branchStatusIdx: index("inventory_counts_branch_status_idx").on(table.branchId, table.status),
    businessDayIdx: index("inventory_counts_business_day_idx").on(table.businessDayId),
    startedAtIdx: index("inventory_counts_started_at_idx").on(table.startedAt),
    statusCheck: check(
      "inventory_counts_status_check",
      sql`status IN ('draft', 'completed', 'cancelled')`
    ),
    scopeCheck: check("inventory_counts_scope_check", sql`scope_type IN ('full', 'partial')`)
  })
);
