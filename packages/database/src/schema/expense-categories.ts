import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  archivedAt,
  createdAt,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";

export const expenseCategories = sqliteTable(
  "expense_categories",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storeCodeUnique: uniqueIndex("expense_categories_store_code_unique").on(
      table.storeId,
      table.code
    ),
    storeStatusIdx: index("expense_categories_store_status_idx").on(table.storeId, table.status),
    storeNameUnique: uniqueIndex("expense_categories_store_name_unique").on(
      table.storeId,
      table.name
    )
  })
);
