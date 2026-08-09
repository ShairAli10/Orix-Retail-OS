import { check, index, sqliteTable } from "drizzle-orm/sqlite-core";
import { products } from "./products.js";
import { purchaseItems } from "./purchase-items.js";
import {
  createdAt,
  nonNegative,
  positive,
  requiredMoneyColumn,
  requiredQuantityColumn,
  requiredUuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { purchaseReturns } from "./purchase-returns.js";

export const purchaseReturnItems = sqliteTable(
  "purchase_return_items",
  {
    id: uuidPrimaryKey(),
    purchaseReturnId: requiredUuidColumn("purchase_return_id").references(() => purchaseReturns.id),
    purchaseItemId: requiredUuidColumn("purchase_item_id").references(() => purchaseItems.id),
    productId: requiredUuidColumn("product_id").references(() => products.id),
    quantity: requiredQuantityColumn("quantity"),
    unitCostMinor: requiredMoneyColumn("unit_cost_minor"),
    lineTotalMinor: requiredMoneyColumn("line_total_minor"),
    createdAt: createdAt()
  },
  (table) => ({
    purchaseReturnIdx: index("purchase_return_items_return_idx").on(table.purchaseReturnId),
    purchaseItemIdx: index("purchase_return_items_purchase_item_idx").on(table.purchaseItemId),
    productCreatedIdx: index("purchase_return_items_product_created_idx").on(
      table.productId,
      table.createdAt
    ),
    quantityPositive: check("purchase_return_items_quantity_positive", positive("quantity")),
    unitCostNonNegative: check(
      "purchase_return_items_unit_cost_non_negative",
      nonNegative("unit_cost_minor")
    ),
    lineTotalNonNegative: check(
      "purchase_return_items_line_total_non_negative",
      nonNegative("line_total_minor")
    )
  })
);
