import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  archivedAt,
  createdAt,
  deviceId,
  syncStatus,
  syncVersion,
  timestampColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";

export const stores = sqliteTable(
  "stores",
  {
    id: uuidPrimaryKey(),
    name: text("name").notNull(),
    tradingName: text("trading_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    registrationNumber: text("registration_number"),
    currencyCode: text("currency_code").notNull().default("PKR"),
    status: text("status").notNull().default("draft"),
    activatedAt: timestampColumn("activated_at"),
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
    statusIdx: index("stores_status_idx").on(table.status),
    nameIdx: index("stores_name_idx").on(table.name),
    registrationUnique: uniqueIndex("stores_registration_number_unique").on(
      table.registrationNumber
    )
  })
);
