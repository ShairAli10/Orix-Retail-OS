import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  createdAt,
  requiredBooleanColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";

export const paymentMethods = sqliteTable(
  "payment_methods",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    methodType: text("method_type").notNull().default("cash"),
    status: text("status").notNull().default("active"),
    isSystemMethod: requiredBooleanColumn("is_system_method").default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storeCodeUnique: uniqueIndex("payment_methods_store_code_unique").on(table.storeId, table.code),
    storeStatusIdx: index("payment_methods_store_status_idx").on(table.storeId, table.status),
    methodTypeIdx: index("payment_methods_type_idx").on(table.methodType)
  })
);
