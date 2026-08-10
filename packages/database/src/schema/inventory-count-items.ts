import { sql } from "drizzle-orm";
import { check, index, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { inventoryCounts } from "./inventory-counts.js";
import { inventoryTransactions } from "./inventory-transactions.js";
import { products } from "./products.js";
import {
  createdAt,
  nonNegative,
  quantityColumn,
  requiredQuantityColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { users } from "./users.js";

export const inventoryCountItems = sqliteTable(
  "inventory_count_items",
  {
    id: uuidPrimaryKey(),
    inventoryCountId: requiredUuidColumn("inventory_count_id").references(() => inventoryCounts.id),
    productId: requiredUuidColumn("product_id").references(() => products.id),
    expectedQuantity: requiredQuantityColumn("expected_quantity"),
    countedQuantity: quantityColumn("counted_quantity"),
    varianceQuantity: quantityColumn("variance_quantity"),
    adjustmentInventoryTransactionId: uuidColumn("adjustment_inventory_transaction_id").references(
      () => inventoryTransactions.id
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    countedByUserId: uuidColumn("counted_by_user_id").references(() => users.id),
    approvedByUserId: uuidColumn("approved_by_user_id").references(() => users.id)
  },
  (table) => ({
    countProductUnique: uniqueIndex("inventory_count_items_count_product_unique").on(
      table.inventoryCountId,
      table.productId
    ),
    countIdx: index("inventory_count_items_count_idx").on(table.inventoryCountId),
    productIdx: index("inventory_count_items_product_idx").on(table.productId),
    adjustmentIdx: index("inventory_count_items_adjustment_idx").on(
      table.adjustmentInventoryTransactionId
    ),
    expectedNonNegative: check(
      "inventory_count_items_expected_non_negative",
      nonNegative("expected_quantity")
    ),
    countedNonNegative: check(
      "inventory_count_items_counted_non_negative",
      sql`counted_quantity IS NULL OR counted_quantity >= 0`
    )
  })
);
