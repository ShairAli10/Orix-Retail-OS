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

export const brands = sqliteTable(
  "brands",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
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
    storeNameUnique: uniqueIndex("brands_store_name_unique").on(table.storeId, table.name),
    storeCodeUnique: uniqueIndex("brands_store_code_unique").on(table.storeId, table.code),
    storeStatusIdx: index("brands_store_status_idx").on(table.storeId, table.status)
  })
);
