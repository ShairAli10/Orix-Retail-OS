import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { stores } from "./stores.js";
import {
  archivedAt,
  createdAt,
  deviceId,
  requiredUuidColumn,
  syncStatus,
  syncVersion,
  timestampColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const users = sqliteTable(
  "users",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    displayName: text("display_name").notNull(),
    username: text("username").notNull(),
    status: text("status").notNull().default("active"),
    lastLoginAt: timestampColumn("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id"),
    syncVersion: syncVersion(),
    syncStatus: syncStatus(),
    deviceId: deviceId()
  },
  (table) => ({
    storeUsernameUnique: uniqueIndex("users_store_username_unique").on(
      table.storeId,
      table.username
    ),
    storeStatusIdx: index("users_store_status_idx").on(table.storeId, table.status),
    lastLoginIdx: index("users_last_login_idx").on(table.lastLoginAt)
  })
);
