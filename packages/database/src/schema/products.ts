import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { brands } from "./brands.js";
import { categories } from "./categories.js";
import {
  archivedAt,
  createdAt,
  moneyColumn,
  nonNegative,
  quantityColumn,
  requiredBooleanColumn,
  requiredUuidColumn,
  updatedAt,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { units } from "./units.js";

export const products = sqliteTable(
  "products",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    categoryId: uuidColumn("category_id").references(() => categories.id),
    brandId: uuidColumn("brand_id").references(() => brands.id),
    unitId: requiredUuidColumn("unit_id").references(() => units.id),
    sku: text("sku"),
    barcode: text("barcode"),
    name: text("name").notNull(),
    description: text("description"),
    productType: text("product_type").notNull().default("standard"),
    status: text("status").notNull().default("draft"),
    isStockTracked: requiredBooleanColumn("is_stock_tracked").default(true),
    isSellable: requiredBooleanColumn("is_sellable").default(true),
    isPurchasable: requiredBooleanColumn("is_purchasable").default(true),
    salePriceMinor: moneyColumn("sale_price_minor"),
    purchaseCostMinor: moneyColumn("purchase_cost_minor"),
    reorderLevelQuantity: quantityColumn("reorder_level_quantity"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    createdByUserId: uuidColumn("created_by_user_id"),
    updatedByUserId: uuidColumn("updated_by_user_id")
  },
  (table) => ({
    storeSkuUnique: uniqueIndex("products_store_sku_unique").on(table.storeId, table.sku),
    storeBarcodeUnique: uniqueIndex("products_store_barcode_unique").on(
      table.storeId,
      table.barcode
    ),
    storeStatusIdx: index("products_store_status_idx").on(table.storeId, table.status),
    nameIdx: index("products_name_idx").on(table.name),
    categoryIdx: index("products_category_idx").on(table.categoryId),
    brandIdx: index("products_brand_idx").on(table.brandId),
    lowStockIdx: index("products_low_stock_idx").on(table.reorderLevelQuantity),
    salePriceNonNegative: check(
      "products_sale_price_non_negative",
      nonNegative("sale_price_minor")
    ),
    purchaseCostNonNegative: check(
      "products_purchase_cost_non_negative",
      nonNegative("purchase_cost_minor")
    ),
    reorderLevelNonNegative: check(
      "products_reorder_level_non_negative",
      nonNegative("reorder_level_quantity")
    )
  })
);
