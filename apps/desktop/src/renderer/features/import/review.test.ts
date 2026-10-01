import { describe, expect, it } from "vitest";
import { reviewProducts } from "./review.js";
import type { LegacyStockImportProductDto } from "@orix/electron";
const product: LegacyStockImportProductDto = {
  sourceItemId: "1",
  name: "Tea",
  categoryName: "Grocery",
  unitName: "Each",
  barcode: "123",
  purchasePriceMinor: 10000,
  salePriceMinor: 15000,
  minimumStock: 1,
  openingStock: 5,
  description: null,
  archived: false
};
describe("import corrections", () => {
  it("blocks excessive quantities and stock values before final import", () => {
    expect(
      reviewProducts([{ ...product, openingStock: 99999999999 }], [])
        .get("1")
        ?.errors.join(" ")
    ).toContain("safe quantity limit");
    expect(
      reviewProducts(
        [{ ...product, openingStock: 2, purchasePriceMinor: Number.MAX_SAFE_INTEGER }],
        []
      )
        .get("1")
        ?.errors.join(" ")
    ).toContain("Stock value");
    expect(reviewProducts([{ ...product, openingStock: 0.125 }], []).get("1")?.errors).toEqual([]);
  });
  it("revalidates duplicate barcodes after an owner edits or excludes a row", () => {
    const second = { ...product, sourceItemId: "2", name: "Coffee" };
    expect(reviewProducts([product, second], []).get("1")?.errors).toContain(
      "Barcode is also used by another included product."
    );
    expect(reviewProducts([product, second], ["2"]).get("1")?.errors).toEqual([]);
    expect(reviewProducts([product, { ...second, barcode: "456" }], []).get("2")?.errors).toEqual(
      []
    );
  });
  it("keeps stock and price errors distinct from acceptable warnings", () => {
    const invalid = reviewProducts([{ ...product, openingStock: -2 }], []).get("1");
    expect(invalid?.errors).toContain("Opening stock cannot be negative.");
    const warning = reviewProducts([{ ...product, barcode: null, salePriceMinor: 0 }], []).get("1");
    expect(warning?.errors).toEqual([]);
    expect(warning?.warnings.length).toBeGreaterThan(0);
  });
  it("rejects unsafe numeric values and missing names", () => {
    expect(
      reviewProducts(
        [
          {
            ...product,
            name: "",
            openingStock: Infinity,
            purchasePriceMinor: Number.MAX_SAFE_INTEGER + 1
          }
        ],
        []
      ).get("1")?.errors.length
    ).toBe(3);
  });
});
