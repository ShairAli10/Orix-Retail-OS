import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import {
  createdAt,
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
import { suppliers } from "./suppliers.js";
import { users } from "./users.js";

export const purchases = sqliteTable(
  "purchases",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    supplierId: requiredUuidColumn("supplier_id").references(() => suppliers.id),
    purchaseNumber: text("purchase_number").notNull(),
    status: text("status").notNull().default("draft"),
    purchaseDate: requiredTimestampColumn("purchase_date"),
    subtotalMinor: requiredMoneyColumn("subtotal_minor").default(0),
    discountMinor: requiredMoneyColumn("discount_minor").default(0),
    taxMinor: requiredMoneyColumn("tax_minor").default(0),
    totalMinor: requiredMoneyColumn("total_minor").default(0),
    paidMinor: requiredMoneyColumn("paid_minor").default(0),
    cancellationReason: text("cancellation_reason"),
    approvedAt: timestampColumn("approved_at"),
    receivedAt: timestampColumn("received_at"),
    cancelledAt: timestampColumn("cancelled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: requiredUuidColumn("created_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id),
    receivedByUserId: uuidColumn("received_by_user_id").references(() => users.id),
    cancelledByUserId: uuidColumn("cancelled_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchPurchaseNumberUnique: uniqueIndex("purchases_branch_number_unique").on(
      table.branchId,
      table.purchaseNumber
    ),
    supplierDateIdx: index("purchases_supplier_date_idx").on(table.supplierId, table.purchaseDate),
    businessDayStatusIdx: index("purchases_day_status_idx").on(table.businessDayId, table.status),
    purchaseDateIdx: index("purchases_purchase_date_idx").on(table.purchaseDate),
    receivedAtIdx: index("purchases_received_at_idx").on(table.receivedAt),
    totalNonNegative: check("purchases_total_non_negative", nonNegative("total_minor")),
    paidNonNegative: check("purchases_paid_non_negative", nonNegative("paid_minor"))
  })
);
