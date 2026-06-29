import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { roles } from "./roles.js";
import { users } from "./users.js";
import {
  requiredTimestampColumn,
  requiredUuidColumn,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const userRoles = sqliteTable(
  "user_roles",
  {
    id: uuidPrimaryKey(),
    userId: requiredUuidColumn("user_id").references(() => users.id),
    roleId: requiredUuidColumn("role_id").references(() => roles.id),
    assignedAt: requiredTimestampColumn("assigned_at"),
    assignedByUserId: requiredUuidColumn("assigned_by_user_id").references(() => users.id),
    revokedAt: timestampColumn("revoked_at"),
    revokedByUserId: uuidColumn("revoked_by_user_id").references(() => users.id)
  },
  (table) => ({
    userIdx: index("user_roles_user_idx").on(table.userId),
    roleIdx: index("user_roles_role_idx").on(table.roleId),
    activeIdx: index("user_roles_active_idx").on(table.userId, table.roleId, table.revokedAt)
  })
);
