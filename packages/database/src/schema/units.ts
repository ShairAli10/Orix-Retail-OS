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

export const units = sqliteTable(
  "units",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    name: text("name").notNull(),
    abbreviation: text("abbreviation").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storeAbbreviationUnique: uniqueIndex("units_store_abbreviation_unique").on(
      table.storeId,
      table.abbreviation
    ),
    storeNameUnique: uniqueIndex("units_store_name_unique").on(table.storeId, table.name),
    storeStatusIdx: index("units_store_status_idx").on(table.storeId, table.status)
  })
);
