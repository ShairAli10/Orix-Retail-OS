import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { permissions } from "./permissions.js";
import { roles } from "./roles.js";
import { users } from "./users.js";
import {
  requiredTimestampColumn,
  requiredUuidColumn,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: uuidPrimaryKey(),
    roleId: requiredUuidColumn("role_id").references(() => roles.id),
    permissionId: requiredUuidColumn("permission_id").references(() => permissions.id),
    grantedAt: requiredTimestampColumn("granted_at"),
    grantedByUserId: requiredUuidColumn("granted_by_user_id").references(() => users.id),
    revokedAt: timestampColumn("revoked_at"),
    revokedByUserId: uuidColumn("revoked_by_user_id").references(() => users.id)
  },
  (table) => ({
    roleIdx: index("role_permissions_role_idx").on(table.roleId),
    permissionIdx: index("role_permissions_permission_idx").on(table.permissionId),
    activeIdx: index("role_permissions_active_idx").on(
      table.roleId,
      table.permissionId,
      table.revokedAt
    )
  })
);
