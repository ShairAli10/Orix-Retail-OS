import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import { customers } from "./customers.js";
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
import { sales } from "./sales.js";
import { users } from "./users.js";

export const salesReturns = sqliteTable(
  "sales_returns",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    originalSaleId: requiredUuidColumn("original_sale_id").references(() => sales.id),
    customerId: uuidColumn("customer_id").references(() => customers.id),
    returnNumber: text("return_number").notNull(),
    status: text("status").notNull().default("posted"),
    reason: text("reason").notNull(),
    refundMethod: text("refund_method").notNull().default("cash"),
    totalRefundMinor: requiredMoneyColumn("total_refund_minor").default(0),
    cashRefundMinor: requiredMoneyColumn("cash_refund_minor").default(0),
    receivableReductionMinor: requiredMoneyColumn("receivable_reduction_minor").default(0),
    returnedAt: requiredTimestampColumn("returned_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: requiredUuidColumn("created_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchReturnNumberUnique: uniqueIndex("sales_returns_branch_number_unique").on(
      table.branchId,
      table.returnNumber
    ),
    originalSaleIdx: index("sales_returns_original_sale_idx").on(table.originalSaleId),
    customerReturnedIdx: index("sales_returns_customer_returned_idx").on(
      table.customerId,
      table.returnedAt
    ),
    businessDayReturnedIdx: index("sales_returns_day_returned_idx").on(
      table.businessDayId,
      table.returnedAt
    ),
    returnedAtIdx: index("sales_returns_returned_at_idx").on(table.returnedAt),
    totalRefundNonNegative: check(
      "sales_returns_total_refund_non_negative",
      nonNegative("total_refund_minor")
    ),
    cashRefundNonNegative: check(
      "sales_returns_cash_refund_non_negative",
      nonNegative("cash_refund_minor")
    ),
    receivableReductionNonNegative: check(
      "sales_returns_receivable_reduction_non_negative",
      nonNegative("receivable_reduction_minor")
    )
  })
);
