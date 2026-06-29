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

export const suppliers = sqliteTable(
  "suppliers",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    status: text("status").notNull().default("active"),
    paymentTerms: text("payment_terms"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storePhoneUnique: uniqueIndex("suppliers_store_phone_unique").on(table.storeId, table.phone),
    storeStatusIdx: index("suppliers_store_status_idx").on(table.storeId, table.status),
    nameIdx: index("suppliers_name_idx").on(table.name),
    createdAtIdx: index("suppliers_created_at_idx").on(table.createdAt)
  })
);
