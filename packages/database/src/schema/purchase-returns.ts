import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import {
  createdAt,
  nonNegative,
  requiredMoneyColumn,
  requiredTimestampColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { purchases } from "./purchases.js";
import { suppliers } from "./suppliers.js";
import { users } from "./users.js";

export const purchaseReturns = sqliteTable(
  "purchase_returns",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    originalPurchaseId: requiredUuidColumn("original_purchase_id").references(() => purchases.id),
    supplierId: requiredUuidColumn("supplier_id").references(() => suppliers.id),
    returnNumber: text("return_number").notNull(),
    status: text("status").notNull().default("posted"),
    reason: text("reason").notNull(),
    totalValueMinor: requiredMoneyColumn("total_value_minor").default(0),
    payableReductionMinor: requiredMoneyColumn("payable_reduction_minor").default(0),
    returnedAt: requiredTimestampColumn("returned_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: requiredUuidColumn("created_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchReturnNumberUnique: uniqueIndex("purchase_returns_branch_number_unique").on(
      table.branchId,
      table.returnNumber
    ),
    originalPurchaseIdx: index("purchase_returns_original_purchase_idx").on(
      table.originalPurchaseId
    ),
    supplierReturnedIdx: index("purchase_returns_supplier_returned_idx").on(
      table.supplierId,
      table.returnedAt
    ),
    businessDayReturnedIdx: index("purchase_returns_day_returned_idx").on(
      table.businessDayId,
      table.returnedAt
    ),
    returnedAtIdx: index("purchase_returns_returned_at_idx").on(table.returnedAt),
    totalValueNonNegative: check(
      "purchase_returns_total_value_non_negative",
      nonNegative("total_value_minor")
    ),
    payableReductionNonNegative: check(
      "purchase_returns_payable_reduction_non_negative",
      nonNegative("payable_reduction_minor")
    )
  })
);
