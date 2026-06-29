import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { stores } from "./stores.js";
import {
  archivedAt,
  createdAt,
  requiredBooleanColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const roles = sqliteTable(
  "roles",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    name: text("name").notNull(),
    description: text("description"),
    isSystemRole: requiredBooleanColumn("is_system_role").default(false),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storeNameUnique: uniqueIndex("roles_store_name_unique").on(table.storeId, table.name),
    storeStatusIdx: index("roles_store_status_idx").on(table.storeId, table.status),
    systemRoleIdx: index("roles_system_role_idx").on(table.isSystemRole)
  })
);
