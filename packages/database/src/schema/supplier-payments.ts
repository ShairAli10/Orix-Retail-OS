import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import { cashAccounts } from "./cash-accounts.js";
import { paymentMethods } from "./payment-methods.js";
import {
  createdAt,
  positive,
  requiredMoneyColumn,
  requiredTimestampColumn,
  requiredUuidColumn,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { suppliers } from "./suppliers.js";
import { users } from "./users.js";

export const supplierPayments = sqliteTable(
  "supplier_payments",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    supplierId: requiredUuidColumn("supplier_id").references(() => suppliers.id),
    cashAccountId: requiredUuidColumn("cash_account_id").references(() => cashAccounts.id),
    paymentMethodId: requiredUuidColumn("payment_method_id").references(() => paymentMethods.id),
    paymentNumber: text("payment_number").notNull(),
    amountMinor: requiredMoneyColumn("amount_minor"),
    status: text("status").notNull().default("recorded"),
    paidAt: requiredTimestampColumn("paid_at"),
    reversedAt: timestampColumn("reversed_at"),
    notes: text("notes"),
    createdAt: createdAt(),
    createdByUserId: requiredUuidColumn("created_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id),
    postedByUserId: requiredUuidColumn("posted_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchPaymentNumberUnique: uniqueIndex("supplier_payments_branch_number_unique").on(
      table.branchId,
      table.paymentNumber
    ),
    supplierPaidAtIdx: index("supplier_payments_supplier_paid_idx").on(
      table.supplierId,
      table.paidAt
    ),
    cashPaidAtIdx: index("supplier_payments_cash_paid_idx").on(table.cashAccountId, table.paidAt),
    businessDayIdx: index("supplier_payments_business_day_idx").on(table.businessDayId),
    paidAtIdx: index("supplier_payments_paid_at_idx").on(table.paidAt),
    amountPositive: check("supplier_payments_amount_positive", positive("amount_minor"))
  })
);
