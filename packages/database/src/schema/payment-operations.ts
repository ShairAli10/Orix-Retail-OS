import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { stores } from "./stores.js";
export const paymentOperations = sqliteTable(
  "payment_operations",
  {
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    kind: text("kind").notNull(),
    operationId: text("operation_id").notNull(),
    requestJson: text("request_json").notNull(),
    resultJson: text("result_json").notNull()
  },
  (table) => ({ pk: primaryKey({ columns: [table.storeId, table.kind, table.operationId] }) })
);
