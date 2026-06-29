import { check, index, sqliteTable } from "drizzle-orm/sqlite-core";
import { products } from "./products.js";
import { purchases } from "./purchases.js";
import {
  createdAt,
  moneyColumn,
  nonNegative,
  positive,
  quantityColumn,
  requiredMoneyColumn,
  requiredQuantityColumn,
  requiredUuidColumn,
  updatedAt,
  uuidPrimaryKey
} from "./shared.js";
import { units } from "./units.js";

export const purchaseItems = sqliteTable(
  "purchase_items",
  {
    id: uuidPrimaryKey(),
    purchaseId: requiredUuidColumn("purchase_id").references(() => purchases.id),
    productId: requiredUuidColumn("product_id").references(() => products.id),
    unitId: requiredUuidColumn("unit_id").references(() => units.id),
    quantity: requiredQuantityColumn("quantity"),
    unitCostMinor: requiredMoneyColumn("unit_cost_minor"),
    discountMinor: moneyColumn("discount_minor"),
    taxMinor: moneyColumn("tax_minor"),
    lineTotalMinor: requiredMoneyColumn("line_total_minor"),
    returnedQuantity: quantityColumn("returned_quantity"),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => ({
    purchaseProductIdx: index("purchase_items_purchase_product_idx").on(
      table.purchaseId,
      table.productId
    ),
    purchaseIdx: index("purchase_items_purchase_idx").on(table.purchaseId),
    productCreatedIdx: index("purchase_items_product_created_idx").on(
      table.productId,
      table.createdAt
    ),
    quantityPositive: check("purchase_items_quantity_positive", positive("quantity")),
    unitCostNonNegative: check(
      "purchase_items_unit_cost_non_negative",
      nonNegative("unit_cost_minor")
    ),
    lineTotalNonNegative: check(
      "purchase_items_line_total_non_negative",
      nonNegative("line_total_minor")
    )
  })
);
