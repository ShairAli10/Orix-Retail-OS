import type { OrixProductImportCandidate } from "./types.js";
export type RowReview = { errors: string[]; warnings: string[] };
export const reviewProducts = (
  products: readonly OrixProductImportCandidate[],
  excluded: readonly string[]
): ReadonlyMap<string, RowReview> => {
  const omitted = new Set(excluded);
  const barcodes = new Map<string, number>();
  const names = new Map<string, number>();
  for (const row of products.filter((row) => !omitted.has(row.sourceItemId))) {
    const barcode = row.barcode?.trim();
    if (barcode) barcodes.set(barcode, (barcodes.get(barcode) ?? 0) + 1);
    const name = row.name.trim().toLowerCase();
    names.set(name, (names.get(name) ?? 0) + 1);
  }
  return new Map(
    products.map((row) => {
      const errors: string[] = [...(row.sourceErrors ?? [])];
      const warnings: string[] = [];
      if (!row.name.trim()) errors.push("Enter a product name.");
      if (!Number.isFinite(row.openingStock)) errors.push("Enter a valid opening quantity.");
      else if (row.openingStock < 0) errors.push("Opening stock cannot be negative.");
      if (!Number.isFinite(row.minimumStock) || row.minimumStock < 0)
        errors.push("Minimum stock must be zero or higher.");
      if (
        ![row.purchasePriceMinor, row.salePriceMinor].every(
          (value) => Number.isSafeInteger(value) && value >= 0
        )
      )
        errors.push("Prices must be valid, non-negative amounts.");
      if (!row.barcode?.trim()) warnings.push("No barcode: this item will need name lookup.");
      else if (!omitted.has(row.sourceItemId) && (barcodes.get(row.barcode.trim()) ?? 0) > 1)
        errors.push("Barcode is also used by another included product.");
      if ((names.get(row.name.trim().toLowerCase()) ?? 0) > 1)
        warnings.push("Repeated name: confirm these are different products.");
      if (row.purchasePriceMinor === 0) warnings.push("Purchase cost is zero.");
      if (row.salePriceMinor === 0) warnings.push("Selling price is zero.");
      else if (row.salePriceMinor < row.purchasePriceMinor)
        warnings.push("Selling price is below cost.");
      if (Number.isFinite(row.openingStock) && !Number.isInteger(row.openingStock))
        warnings.push("Fractional stock: confirm the unit and quantity.");
      if (row.openingStock > 10000) warnings.push("Unusually high stock: verify the quantity.");
      return [row.sourceItemId, { errors, warnings }];
    })
  );
};
