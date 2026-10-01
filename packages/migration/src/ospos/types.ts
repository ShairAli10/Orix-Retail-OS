export type OspoItemRow = {
  readonly itemId: string;
  readonly name: string;
  readonly category: string | null;
  readonly barcode: string | null;
  readonly description: string | null;
  readonly costPrice: number;
  readonly salePrice: number;
  readonly reorderLevel: number;
  readonly receivingQuantity: number;
  readonly deleted: boolean;
  readonly packName: string | null;
};

export type OspoStoreProfile = {
  readonly company: string | null;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly currencyCode: string | null;
};

export type OspoStockLocation = {
  readonly locationId: string;
  readonly name: string;
  readonly deleted: boolean;
};

export type OspoQuantityRow = {
  readonly itemId: string;
  readonly locationId: string;
  readonly quantity: number;
};

export type OspoMigrationIssueSeverity = "info" | "warning" | "error";

export type OspoMigrationIssue = {
  readonly severity: OspoMigrationIssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly itemId?: string;
  readonly value?: string;
};

export type OrixProductImportCandidate = {
  readonly sourceItemId: string;
  readonly sourceErrors?: readonly string[];
  readonly name: string;
  readonly categoryName: string;
  readonly unitName: string;
  readonly barcode: string | null;
  readonly purchasePriceMinor: number;
  readonly salePriceMinor: number;
  readonly minimumStock: number;
  readonly openingStock: number;
  readonly description: string | null;
  readonly archived: boolean;
};

export type OspoMigrationPreview = {
  readonly generatedAt: string;
  readonly source: {
    readonly itemsFile: string;
    readonly sqlFile: string | null;
  };
  readonly store: OspoStoreProfile;
  readonly totals: {
    readonly itemRows: number;
    readonly activeItems: number;
    readonly archivedItems: number;
    readonly importableProducts: number;
    readonly categories: number;
    readonly units: number;
    readonly stockLocations: number;
    readonly quantityRows: number;
    readonly productsWithPositiveStock: number;
    readonly productsWithNegativeStock: number;
    readonly duplicateBarcodes: number;
    readonly duplicateNames: number;
    readonly missingBarcodes: number;
    readonly zeroCostPrice: number;
    readonly zeroSalePrice: number;
  };
  readonly issues: readonly OspoMigrationIssue[];
  readonly stockLocations: readonly OspoStockLocation[];
  readonly products: readonly OrixProductImportCandidate[];
  readonly sampleProducts: readonly OrixProductImportCandidate[];
};

export type SqlContactCandidate = {
  readonly sourceId: string;
  readonly kind: "customer" | "supplier";
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly city: string;
};

export type SqlImportReview = {
  readonly sourceName: string;
  readonly sourceHash: string;
  readonly sourceTimezone: string | null;
  readonly storeTimezone: string;
  readonly generatedAt: string;
  readonly latestSaleAt: string | null;
  readonly storeName: string;
  readonly currency: string | null;
  readonly archivedProducts: number;
  readonly products: readonly OrixProductImportCandidate[];
  readonly contacts: readonly SqlContactCandidate[];
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
};
