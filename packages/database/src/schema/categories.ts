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

export const categories = sqliteTable(
  "categories",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    parentCategoryId: uuidColumn("parent_category_id"),
    name: text("name").notNull(),
    code: text("code"),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    parentIdx: index("categories_parent_idx").on(table.parentCategoryId),
    storeStatusIdx: index("categories_store_status_idx").on(table.storeId, table.status),
    storeParentNameUnique: uniqueIndex("categories_store_parent_name_unique").on(
      table.storeId,
      table.parentCategoryId,
      table.name
    ),
    storeCodeUnique: uniqueIndex("categories_store_code_unique").on(table.storeId, table.code)
  })
);
