import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import { customers } from "./customers.js";
import {
  createdAt,
  moneyColumn,
  nonNegative,
  requiredMoneyColumn,
  requiredTimestampColumn,
  requiredUuidColumn,
  timestampColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const sales = sqliteTable(
  "sales",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    customerId: uuidColumn("customer_id").references(() => customers.id),
    clientOperationId: text("client_operation_id"),
    clientOperationHash: text("client_operation_hash"),
    saleNumber: text("sale_number").notNull(),
    saleType: text("sale_type").notNull().default("cash"),
    status: text("status").notNull().default("draft"),
    saleDate: requiredTimestampColumn("sale_date"),
    subtotalMinor: requiredMoneyColumn("subtotal_minor").default(0),
    discountMinor: requiredMoneyColumn("discount_minor").default(0),
    taxMinor: requiredMoneyColumn("tax_minor").default(0),
    totalMinor: requiredMoneyColumn("total_minor").default(0),
    paidMinor: requiredMoneyColumn("paid_minor").default(0),
    changeDueMinor: moneyColumn("change_due_minor"),
    cancellationReason: text("cancellation_reason"),
    completedAt: timestampColumn("completed_at"),
    cancelledAt: timestampColumn("cancelled_at"),
    returnedAt: timestampColumn("returned_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: requiredUuidColumn("created_by_user_id").references(() => users.id),
    completedByUserId: uuidColumn("completed_by_user_id").references(() => users.id),
    cancelledByUserId: uuidColumn("cancelled_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchSaleNumberUnique: uniqueIndex("sales_branch_sale_number_unique").on(
      table.branchId,
      table.saleNumber
    ),
    storeOperationUnique: uniqueIndex("sales_store_operation_unique").on(
      table.storeId,
      table.clientOperationId
    ),
    businessDayStatusIdx: index("sales_day_status_idx").on(table.businessDayId, table.status),
    customerDateIdx: index("sales_customer_date_idx").on(table.customerId, table.saleDate),
    saleDateIdx: index("sales_sale_date_idx").on(table.saleDate),
    completedAtIdx: index("sales_completed_at_idx").on(table.completedAt),
    statusIdx: index("sales_status_idx").on(table.status),
    subtotalNonNegative: check("sales_subtotal_non_negative", nonNegative("subtotal_minor")),
    discountNonNegative: check("sales_discount_non_negative", nonNegative("discount_minor")),
    taxNonNegative: check("sales_tax_non_negative", nonNegative("tax_minor")),
    totalNonNegative: check("sales_total_non_negative", nonNegative("total_minor")),
    paidNonNegative: check("sales_paid_non_negative", nonNegative("paid_minor"))
  })
);
