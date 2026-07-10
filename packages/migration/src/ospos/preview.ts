import { parseOspoItemsCsvFile } from "./csv.js";
import { parseOspoSqlFile } from "./sql.js";
import type {
  OrixProductImportCandidate,
  OspoItemRow,
  OspoMigrationIssue,
  OspoMigrationPreview,
  OspoQuantityRow,
  OspoStockLocation,
  OspoStoreProfile
} from "./types.js";

export type CreateOspoMigrationPreviewInput = {
  readonly itemsFile: string;
  readonly sqlFile?: string;
  readonly includeArchived?: boolean;
  readonly sampleSize?: number;
};

export const createOspoMigrationPreview = async (
  input: CreateOspoMigrationPreviewInput
): Promise<OspoMigrationPreview> => {
  const items = await parseOspoItemsCsvFile(input.itemsFile);
  const sql =
    input.sqlFile === undefined
      ? {
          store: emptyStore(),
          quantities: [] as readonly OspoQuantityRow[],
          stockLocations: [] as readonly OspoStockLocation[]
        }
      : await parseOspoSqlFile(input.sqlFile);
  const quantityByItemId = sumQuantitiesByItemId(sql.quantities);
  const candidates = items
    .filter((item) => input.includeArchived === true || !item.deleted)
    .map((item) => toCandidate(item, quantityByItemId.get(item.itemId) ?? 0));
  const issues = buildIssues(items, sql.quantities, quantityByItemId);
  const activeItems = items.filter((item) => !item.deleted);
  const sampleSize = input.sampleSize ?? 20;

  return {
    generatedAt: new Date().toISOString(),
    source: {
      itemsFile: input.itemsFile,
      sqlFile: input.sqlFile ?? null
    },
    store: sql.store,
    totals: {
      itemRows: items.length,
      activeItems: activeItems.length,
      archivedItems: items.length - activeItems.length,
      importableProducts: candidates.length,
      categories: new Set(candidates.map((item) => item.categoryName)).size,
      units: new Set(candidates.map((item) => item.unitName)).size,
      stockLocations: sql.stockLocations.filter((location) => !location.deleted).length,
      quantityRows: sql.quantities.length,
      productsWithPositiveStock: candidates.filter((item) => item.openingStock > 0).length,
      productsWithNegativeStock: candidates.filter((item) => item.openingStock < 0).length,
      duplicateBarcodes: duplicateCount(candidates.map((item) => item.barcode).filter(isText)),
      duplicateNames: duplicateCount(candidates.map((item) => item.name.toLocaleLowerCase())),
      missingBarcodes: candidates.filter((item) => item.barcode === null).length,
      zeroCostPrice: candidates.filter((item) => item.purchasePriceMinor === 0).length,
      zeroSalePrice: candidates.filter((item) => item.salePriceMinor === 0).length
    },
    issues,
    stockLocations: sql.stockLocations,
    products: candidates,
    sampleProducts: candidates.slice(0, sampleSize)
  };
};

const toCandidate = (item: OspoItemRow, openingStock: number): OrixProductImportCandidate => ({
  sourceItemId: item.itemId,
  name: item.name,
  categoryName: item.category ?? "Uncategorized",
  unitName: item.packName ?? "Each",
  barcode: item.barcode,
  purchasePriceMinor: moneyToMinor(item.costPrice),
  salePriceMinor: moneyToMinor(item.salePrice),
  minimumStock: item.reorderLevel,
  openingStock,
  description: item.description,
  archived: item.deleted
});

const buildIssues = (
  items: readonly OspoItemRow[],
  quantities: readonly OspoQuantityRow[],
  quantityByItemId: ReadonlyMap<string, number>
): readonly OspoMigrationIssue[] => {
  const activeItems = items.filter((item) => !item.deleted);
  const issues: OspoMigrationIssue[] = [];
  const barcodeCounts = countValues(activeItems.map((item) => item.barcode).filter(isText));
  const nameCounts = countValues(activeItems.map((item) => item.name.toLocaleLowerCase()));

  if (quantities.length === 0) {
    issues.push({
      severity: "error",
      code: "MISSING_STOCK_QUANTITIES",
      message:
        "No ospos_item_quantities rows were found. Current inventory cannot be migrated safely."
    });
  }

  for (const item of activeItems) {
    if (item.barcode === null) {
      issues.push({
        severity: "warning",
        code: "MISSING_BARCODE",
        message: "Product has no barcode and will need manual review.",
        itemId: item.itemId,
        value: item.name
      });
    } else if ((barcodeCounts.get(item.barcode) ?? 0) > 1) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_BARCODE",
        message: "Barcode is used by more than one active product.",
        itemId: item.itemId,
        value: item.barcode
      });
    }

    if ((nameCounts.get(item.name.toLocaleLowerCase()) ?? 0) > 1) {
      issues.push({
        severity: "warning",
        code: "DUPLICATE_NAME",
        message: "Product name is repeated among active products.",
        itemId: item.itemId,
        value: item.name
      });
    }

    if (item.salePrice < item.costPrice) {
      issues.push({
        severity: "warning",
        code: "SALE_BELOW_COST",
        message: "Sale price is lower than purchase cost.",
        itemId: item.itemId,
        value: item.name
      });
    }

    const quantity = quantityByItemId.get(item.itemId);
    if (quantity === undefined) {
      issues.push({
        severity: "warning",
        code: "MISSING_ITEM_QUANTITY",
        message: "Product has no matching ospos_item_quantities row.",
        itemId: item.itemId,
        value: item.name
      });
    } else if (quantity < 0) {
      issues.push({
        severity: "error",
        code: "NEGATIVE_STOCK",
        message: "Product has negative current stock and cannot become opening stock directly.",
        itemId: item.itemId,
        value: String(quantity)
      });
    }
  }

  return issues;
};

const sumQuantitiesByItemId = (
  quantities: readonly OspoQuantityRow[]
): ReadonlyMap<string, number> => {
  const byItemId = new Map<string, number>();
  for (const quantity of quantities) {
    byItemId.set(quantity.itemId, (byItemId.get(quantity.itemId) ?? 0) + quantity.quantity);
  }
  return byItemId;
};

const duplicateCount = (values: readonly string[]): number =>
  [...countValues(values).values()].filter((count) => count > 1).length;

const countValues = (values: readonly string[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
};

const isText = (value: string | null): value is string => value !== null && value.trim() !== "";

const moneyToMinor = (value: number): number => Math.round(value * 100);

const emptyStore = (): OspoStoreProfile => ({
  company: null,
  address: null,
  phone: null,
  email: null,
  currencyCode: null
});
