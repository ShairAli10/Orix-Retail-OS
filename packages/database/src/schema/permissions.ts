import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  createdAt,
  requiredBooleanColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const permissions = sqliteTable(
  "permissions",
  {
    id: uuidPrimaryKey(),
    code: text("code").notNull(),
    module: text("module").notNull(),
    action: text("action").notNull(),
    description: text("description"),
    isSystemPermission: requiredBooleanColumn("is_system_permission").default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: uuidColumn("created_by_user_id")
  },
  (table) => ({
    codeUnique: uniqueIndex("permissions_code_unique").on(table.code),
    moduleActionIdx: index("permissions_module_action_idx").on(table.module, table.action),
    moduleIdx: index("permissions_module_idx").on(table.module)
  })
);
