import { check, index, sqliteTable } from "drizzle-orm/sqlite-core";
import { products } from "./products.js";
import { sales } from "./sales.js";
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

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: uuidPrimaryKey(),
    saleId: requiredUuidColumn("sale_id").references(() => sales.id),
    productId: requiredUuidColumn("product_id").references(() => products.id),
    unitId: requiredUuidColumn("unit_id").references(() => units.id),
    quantity: requiredQuantityColumn("quantity"),
    unitPriceMinor: requiredMoneyColumn("unit_price_minor"),
    discountMinor: moneyColumn("discount_minor"),
    taxMinor: moneyColumn("tax_minor"),
    lineTotalMinor: requiredMoneyColumn("line_total_minor"),
    returnedQuantity: quantityColumn("returned_quantity"),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => ({
    saleProductIdx: index("sale_items_sale_product_idx").on(table.saleId, table.productId),
    saleIdx: index("sale_items_sale_idx").on(table.saleId),
    productCreatedIdx: index("sale_items_product_created_idx").on(table.productId, table.createdAt),
    quantityPositive: check("sale_items_quantity_positive", positive("quantity")),
    unitPriceNonNegative: check(
      "sale_items_unit_price_non_negative",
      nonNegative("unit_price_minor")
    ),
    lineTotalNonNegative: check(
      "sale_items_line_total_non_negative",
      nonNegative("line_total_minor")
    )
  })
);
