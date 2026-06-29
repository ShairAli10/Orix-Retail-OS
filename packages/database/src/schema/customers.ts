import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  archivedAt,
  createdAt,
  moneyColumn,
  nonNegative,
  requiredBooleanColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";

export const customers = sqliteTable(
  "customers",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    status: text("status").notNull().default("active"),
    creditAllowed: requiredBooleanColumn("credit_allowed").default(false),
    creditLimitMinor: moneyColumn("credit_limit_minor"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storePhoneUnique: uniqueIndex("customers_store_phone_unique").on(table.storeId, table.phone),
    storeStatusIdx: index("customers_store_status_idx").on(table.storeId, table.status),
    nameIdx: index("customers_name_idx").on(table.name),
    createdAtIdx: index("customers_created_at_idx").on(table.createdAt),
    creditLimitNonNegative: check(
      "customers_credit_limit_non_negative",
      nonNegative("credit_limit_minor")
    )
  })
);
