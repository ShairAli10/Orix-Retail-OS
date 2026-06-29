import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import { products } from "./products.js";
import {
  createdAt,
  moneyColumn,
  positive,
  requiredQuantityColumn,
  requiredTimestampColumn,
  requiredUuidColumn,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const inventoryTransactions = sqliteTable(
  "inventory_transactions",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: requiredUuidColumn("branch_id").references(() => branches.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    productId: requiredUuidColumn("product_id").references(() => products.id),
    sourceType: text("source_type").notNull(),
    sourceId: requiredUuidColumn("source_id"),
    movementType: text("movement_type").notNull(),
    direction: text("direction").notNull(),
    quantity: requiredQuantityColumn("quantity"),
    unitCostMinor: moneyColumn("unit_cost_minor"),
    reason: text("reason"),
    status: text("status").notNull().default("posted"),
    postedAt: requiredTimestampColumn("posted_at"),
    postedByUserId: requiredUuidColumn("posted_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id),
    reversedAt: timestampColumn("reversed_at"),
    reversalOfInventoryTransactionId: uuidColumn("reversal_of_inventory_transaction_id"),
    createdAt: createdAt()
  },
  (table) => ({
    sourceUnique: uniqueIndex("inventory_transactions_source_unique").on(
      table.sourceType,
      table.sourceId,
      table.productId,
      table.movementType
    ),
    productPostedIdx: index("inventory_transactions_product_posted_idx").on(
      table.productId,
      table.postedAt
    ),
    branchPostedIdx: index("inventory_transactions_branch_posted_idx").on(
      table.branchId,
      table.postedAt
    ),
    sourceIdx: index("inventory_transactions_source_idx").on(table.sourceType, table.sourceId),
    movementPostedIdx: index("inventory_transactions_movement_posted_idx").on(
      table.movementType,
      table.postedAt
    ),
    statusIdx: index("inventory_transactions_status_idx").on(table.status),
    quantityPositive: check("inventory_transactions_quantity_positive", positive("quantity"))
  })
);
