import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  createdAt,
  requiredBooleanColumn,
  requiredTimestampColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const settings = sqliteTable(
  "settings",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    valueType: text("value_type").notNull(),
    category: text("category").notNull(),
    isSensitive: requiredBooleanColumn("is_sensitive").default(false),
    isLocked: requiredBooleanColumn("is_locked").default(false),
    effectiveAt: requiredTimestampColumn("effective_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    createdByUserId: uuidColumn("created_by_user_id").references(() => users.id),
    updatedByUserId: uuidColumn("updated_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id)
  },
  (table) => ({
    storeKeyEffectiveUnique: uniqueIndex("settings_store_key_effective_unique").on(
      table.storeId,
      table.key,
      table.effectiveAt
    ),
    storeKeyIdx: index("settings_store_key_idx").on(table.storeId, table.key),
    categoryKeyIdx: index("settings_category_key_idx").on(table.category, table.key),
    effectiveAtIdx: index("settings_effective_at_idx").on(table.effectiveAt)
  })
);
