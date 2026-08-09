import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { products } from "./products.js";
import { saleItems } from "./sale-items.js";
import {
  createdAt,
  nonNegative,
  positive,
  requiredMoneyColumn,
  requiredQuantityColumn,
  requiredUuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { salesReturns } from "./sales-returns.js";

export const salesReturnItems = sqliteTable(
  "sales_return_items",
  {
    id: uuidPrimaryKey(),
    salesReturnId: requiredUuidColumn("sales_return_id").references(() => salesReturns.id),
    saleItemId: requiredUuidColumn("sale_item_id").references(() => saleItems.id),
    productId: requiredUuidColumn("product_id").references(() => products.id),
    quantity: requiredQuantityColumn("quantity"),
    condition: text("condition").notNull().default("sellable"),
    restockAction: text("restock_action").notNull().default("return-to-stock"),
    unitPriceMinor: requiredMoneyColumn("unit_price_minor"),
    lineTotalMinor: requiredMoneyColumn("line_total_minor"),
    createdAt: createdAt()
  },
  (table) => ({
    salesReturnIdx: index("sales_return_items_return_idx").on(table.salesReturnId),
    saleItemIdx: index("sales_return_items_sale_item_idx").on(table.saleItemId),
    productCreatedIdx: index("sales_return_items_product_created_idx").on(
      table.productId,
      table.createdAt
    ),
    quantityPositive: check("sales_return_items_quantity_positive", positive("quantity")),
    unitPriceNonNegative: check(
      "sales_return_items_unit_price_non_negative",
      nonNegative("unit_price_minor")
    ),
    lineTotalNonNegative: check(
      "sales_return_items_line_total_non_negative",
      nonNegative("line_total_minor")
    )
  })
);
