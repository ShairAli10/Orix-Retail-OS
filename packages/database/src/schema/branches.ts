import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { stores } from "./stores.js";
import {
  createdAt,
  deviceId,
  requiredBooleanColumn,
  requiredUuidColumn,
  syncStatus,
  syncVersion,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const branches = sqliteTable(
  "branches",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    address: text("address"),
    status: text("status").notNull().default("active"),
    isDefault: requiredBooleanColumn("is_default").default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id"),
    syncVersion: syncVersion(),
    syncStatus: syncStatus(),
    deviceId: deviceId()
  },
  (table) => ({
    storeStatusIdx: index("branches_store_status_idx").on(table.storeId, table.status),
    storeCodeUnique: uniqueIndex("branches_store_code_unique").on(table.storeId, table.code),
    storeNameUnique: uniqueIndex("branches_store_name_unique").on(table.storeId, table.name),
    defaultIdx: index("branches_store_default_idx").on(table.storeId, table.isDefault)
  })
);
