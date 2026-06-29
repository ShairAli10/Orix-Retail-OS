import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import { cashAccounts } from "./cash-accounts.js";
import { expenseCategories } from "./expense-categories.js";
import {
  createdAt,
  positive,
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

export const expenses = sqliteTable(
  "expenses",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    expenseCategoryId: requiredUuidColumn("expense_category_id").references(
      () => expenseCategories.id
    ),
    cashAccountId: requiredUuidColumn("cash_account_id").references(() => cashAccounts.id),
    expenseNumber: text("expense_number").notNull(),
    description: text("description").notNull(),
    amountMinor: requiredMoneyColumn("amount_minor"),
    status: text("status").notNull().default("recorded"),
    expenseDate: requiredTimestampColumn("expense_date"),
    postedAt: timestampColumn("posted_at"),
    reversedAt: timestampColumn("reversed_at"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: requiredUuidColumn("created_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id),
    postedByUserId: uuidColumn("posted_by_user_id").references(() => users.id)
  },
  (table) => ({
    branchExpenseNumberUnique: uniqueIndex("expenses_branch_number_unique").on(
      table.branchId,
      table.expenseNumber
    ),
    categoryDateIdx: index("expenses_category_date_idx").on(
      table.expenseCategoryId,
      table.expenseDate
    ),
    cashDateIdx: index("expenses_cash_date_idx").on(table.cashAccountId, table.expenseDate),
    businessDayIdx: index("expenses_business_day_idx").on(table.businessDayId),
    expenseDateIdx: index("expenses_expense_date_idx").on(table.expenseDate),
    amountPositive: check("expenses_amount_positive", positive("amount_minor"))
  })
);
