import type { Result } from "@orix/shared";

export type IpcChannel = `orix:${string}`;

export type IpcRequest<TPayload extends object = Record<string, never>> = {
  readonly requestId: string;
  readonly payload: TPayload;
};

export type IpcResponse<TSuccess, TError extends object> = Result<TSuccess, TError>;

export type IpcContract<
  TChannel extends IpcChannel,
  TRequestPayload extends object,
  TSuccess,
  TError extends object
> = {
  readonly channel: TChannel;
  readonly request: IpcRequest<TRequestPayload>;
  readonly response: IpcResponse<TSuccess, TError>;
};

export type SystemHealthContract = IpcContract<
  "orix:system.health",
  Record<string, never>,
  {
    readonly status: "ok";
  },
  {
    readonly code: "system.unavailable";
    readonly message: string;
  }
>;

export type ProductStatusFilter = "active" | "inactive" | "archived" | "all";

export type ProductListRequest = {
  readonly barcode?: string;
  readonly search?: string;
  readonly categoryId?: string;
  readonly brandId?: string;
  readonly status?: ProductStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: "barcode" | "name" | "purchasePrice" | "salePrice" | "stock" | "status";
  readonly sortDirection: "asc" | "desc";
};

export type ProductListItemDto = {
  readonly id: string;
  readonly barcode: string | null;
  readonly name: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly unitId: string;
  readonly unitName: string;
  readonly purchasePriceMinor: number;
  readonly salePriceMinor: number;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly status: string;
  readonly archivedAt: string | null;
  readonly updatedAt: string | null;
};

export type ProductDetailDto = ProductListItemDto & {
  readonly description: string | null;
  readonly createdAt: string;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
};

export type ProductPageDto = {
  readonly items: readonly ProductListItemDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type ProductFormPayload = {
  readonly id?: string;
  readonly name: string;
  readonly barcode?: string | null;
  readonly categoryId: string;
  readonly brandId?: string | null;
  readonly unitId: string;
  readonly purchasePriceMinor: number;
  readonly salePriceMinor: number;
  readonly openingStock: number;
  readonly minimumStock: number;
  readonly description?: string | null;
  readonly active: boolean;
  readonly confirmSaleBelowPurchase?: boolean;
  readonly expectedUpdatedAt?: string | null;
};

export type CatalogItemKind = "category" | "brand" | "unit";

export type CatalogItemDto = {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly abbreviation?: string;
  readonly status: string;
  readonly archivedAt: string | null;
};

export type ProductCatalogDto = {
  readonly categories: readonly CatalogItemDto[];
  readonly brands: readonly CatalogItemDto[];
  readonly units: readonly CatalogItemDto[];
};

export type CatalogWritePayload = {
  readonly id?: string;
  readonly kind: CatalogItemKind;
  readonly name: string;
  readonly code?: string | null;
  readonly abbreviation?: string;
};

export type ProductIpcError = {
  readonly code: string;
  readonly message: string;
  readonly fields?: readonly string[];
};

export type AppIpcError = {
  readonly code: string;
  readonly message: string;
};

export type AppThemePreference = "light" | "dark" | "system";

export type AppSettingsDto = {
  readonly theme: AppThemePreference;
  readonly storeDisplayName: string;
  readonly receiptHeader: string;
  readonly receiptFooter: string;
  readonly backupLocation: string;
};

export type BackupStatus = "started" | "completed" | "failed";

export type BackupRecordDto = {
  readonly id: string;
  readonly backupNumber: string;
  readonly status: BackupStatus;
  readonly fileName: string;
  readonly filePath: string | null;
  readonly fileSizeBytes: number | null;
  readonly checksum: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly verifiedAt: string | null;
  readonly failureReason: string | null;
};

export type BackupStatusDto = {
  readonly backupLocation: string;
  readonly lastBackup: BackupRecordDto | null;
  readonly recentBackups: readonly BackupRecordDto[];
};

export type BackupDirectorySelectionDto = {
  readonly directoryPath: string | null;
};

export type BackupFileSelectionDto = {
  readonly filePath: string | null;
};

export type BackupVerificationDto = {
  readonly valid: boolean;
  readonly message: string;
  readonly checkedAt: string;
};

export type RestoreBackupPayload = {
  readonly filePath: string;
  readonly confirmation: string;
};

export type RestoreBackupDto = {
  readonly restored: boolean;
  readonly restartScheduled: boolean;
  readonly safetyBackupPath: string;
};

export type MigrationIssueSeverity = "info" | "warning" | "error";

export type MigrationIssueDto = {
  readonly severity: MigrationIssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly itemId?: string;
  readonly value?: string;
};

export type LegacyStockImportProductDto = {
  readonly sourceItemId: string;
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

export type LegacyStockImportPreviewDto = {
  readonly generatedAt: string;
  readonly source: {
    readonly itemsFile: string;
    readonly sqlFile: string | null;
  };
  readonly store: {
    readonly company: string | null;
    readonly address: string | null;
    readonly phone: string | null;
    readonly email: string | null;
    readonly currencyCode: string | null;
  };
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
  readonly issues: readonly MigrationIssueDto[];
  readonly sampleProducts: readonly LegacyStockImportProductDto[];
};

export type LegacyStockImportFilesDto = {
  readonly selectedFiles: readonly string[];
  readonly itemsFile: string | null;
  readonly sqlFile: string | null;
};

export type LegacyStockImportPreviewPayload = {
  readonly itemsFile: string;
  readonly sqlFile?: string;
};

export type LegacyStockImportPayload = {
  readonly itemsFile: string;
  readonly sqlFile: string;
  readonly mode: "valid-only" | "strict";
};

export type LegacyStockImportSkippedProductDto = {
  readonly sourceItemId: string;
  readonly name: string;
  readonly reason: string;
};

export type LegacyStockImportResultDto = {
  readonly importedAt: string;
  readonly createdCategories: number;
  readonly createdUnits: number;
  readonly createdProducts: number;
  readonly openingStockTransactions: number;
  readonly skippedProducts: readonly LegacyStockImportSkippedProductDto[];
};

export type MigrationIpcError = {
  readonly code: string;
  readonly message: string;
};

export type AppContextDto = {
  readonly storeName: string;
  readonly storePhone: string | null;
  readonly storeEmail: string | null;
  readonly storeAddress: string | null;
  readonly storeLogoDataUrl: string | null;
  readonly businessDayStatus: "open" | "closed";
  readonly currentUser: string;
  readonly currentUserId: string;
  readonly currentBranch: string;
  readonly businessDate: string;
  readonly applicationVersion: string;
  readonly databaseConnected: boolean;
  readonly syncStatus: "offline";
  readonly permissions: readonly PermissionCode[];
};

export type PermissionCode =
  | "dashboard.view"
  | "pos.view"
  | "inventory.view"
  | "inventory.manage"
  | "products.view"
  | "products.manage"
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.delete"
  | "customers.payments"
  | "customers.export"
  | "suppliers.view"
  | "suppliers.create"
  | "suppliers.edit"
  | "suppliers.delete"
  | "suppliers.payments"
  | "suppliers.export"
  | "purchases.view"
  | "purchases.create"
  | "purchases.edit"
  | "purchases.receive"
  | "purchases.cancel"
  | "purchases.return"
  | "sales.view"
  | "sales.create"
  | "sales.complete"
  | "sales.cancel"
  | "sales.return"
  | "sales.print"
  | "expenses.view"
  | "expenses.manage"
  | "reports.view"
  | "settings.view"
  | "settings.manage"
  | "users.view"
  | "users.manage"
  | "about.view";

export type RoleName =
  "Owner" | "Manager" | "Cashier" | "Inventory Manager" | "Accountant" | "Viewer";

export type AuthStatusDto = {
  readonly needsSetup: boolean;
  readonly authenticated: boolean;
  readonly locked: boolean;
  readonly rememberedUsername: string | null;
  readonly storeName: string | null;
  readonly storeLogoDataUrl: string | null;
};

export type SetupStorePayload = {
  readonly storeName: string;
  readonly businessName: string;
  readonly ownerName: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly logoDataUrl: string | null;
  readonly currency: string;
  readonly timezone: string;
  readonly taxEnabled: boolean;
  readonly branchName: string;
  readonly adminFullName: string;
  readonly username: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly pin: string;
};

export type LoginPayload = {
  readonly username: string;
  readonly password?: string;
  readonly pin?: string;
  readonly rememberMe: boolean;
};

export type UnlockPayload = {
  readonly password?: string;
  readonly pin?: string;
};

export type AuthUserDto = {
  readonly id: string;
  readonly fullName: string;
  readonly username: string;
  readonly status: "active" | "disabled";
  readonly roleNames: readonly RoleName[];
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
};

export type UserManagementListDto = {
  readonly users: readonly AuthUserDto[];
  readonly roles: readonly RoleName[];
};

export type UserSavePayload = {
  readonly id?: string;
  readonly fullName: string;
  readonly username: string;
  readonly password?: string;
  readonly pin?: string;
  readonly roleNames: readonly RoleName[];
  readonly status: "active" | "disabled";
};

export type ResetSecretPayload = {
  readonly userId: string;
  readonly password?: string;
  readonly pin?: string;
};

export type DashboardMetricDto = {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
};

export type RecentActivityDto = {
  readonly id: string;
  readonly name: string;
  readonly occurredAt: string;
};

export type DashboardDto = {
  readonly todaySalesMinor: number;
  readonly todayPurchasesMinor: number;
  readonly cashInDrawerMinor: number;
  readonly outstandingCustomersMinor: number;
  readonly outstandingSuppliersMinor: number;
  readonly lowStockCount: number;
  readonly todayCollectionsMinor: number;
  readonly customersAddedToday: number;
  readonly supplierPaymentsTodayMinor: number;
  readonly purchasesThisMonthMinor: number;
  readonly pendingSupplierPaymentsMinor: number;
  readonly topSellingProductName: string | null;
  readonly recentActivity: readonly RecentActivityDto[];
  readonly topDebtors: readonly CustomerSummaryDto[];
  readonly recentlyActiveCustomers: readonly CustomerSummaryDto[];
  readonly topSuppliers: readonly SupplierSummaryDto[];
};

export type ReportRequest = {
  readonly dateFrom: string;
  readonly dateTo: string;
};

export type DailySalesReportRowDto = {
  readonly refundedMinor: number;
  readonly netTotalMinor: number;
  readonly saleId: string;
  readonly saleNumber: string;
  readonly saleDate: string;
  readonly customerName: string;
  readonly itemCount: number;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly cashierName: string;
};

export type CashDrawerReportDto = {
  readonly openingCashMinor: number;
  readonly cashSalesMinor: number;
  readonly customerCollectionsMinor: number;
  readonly supplierPaymentsMinor: number;
  readonly expectedCashMinor: number;
  readonly sessionStatus: "open" | "closed" | "not-opened";
};

export type InventoryValueReportRowDto = {
  readonly productId: string;
  readonly barcode: string | null;
  readonly productName: string;
  readonly categoryName: string | null;
  readonly currentStock: number;
  readonly purchasePriceMinor: number;
  readonly salePriceMinor: number;
  readonly purchaseValueMinor: number;
  readonly retailValueMinor: number;
};

export type LowStockReportRowDto = {
  readonly productId: string;
  readonly barcode: string | null;
  readonly productName: string;
  readonly categoryName: string | null;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly needToOrder: number;
};

export type ReceivableReportRowDto = {
  readonly customerId: string;
  readonly customerName: string;
  readonly phone: string | null;
  readonly balanceMinor: number;
  readonly creditLimitMinor: number;
  readonly lastActivityAt: string | null;
};

export type PayableReportRowDto = {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly phone: string | null;
  readonly balanceMinor: number;
  readonly lastActivityAt: string | null;
};

export type ReportsSummaryDto = {
  readonly generatedAt: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly totals: {
    readonly grossSalesMinor: number;
    readonly returnsMinor: number;
    readonly salesMinor: number;
    readonly cashExpectedMinor: number;
    readonly inventoryPurchaseValueMinor: number;
    readonly inventoryRetailValueMinor: number;
    readonly receivablesMinor: number;
    readonly payablesMinor: number;
    readonly lowStockCount: number;
  };
  readonly dailySales: readonly DailySalesReportRowDto[];
  readonly cashDrawer: CashDrawerReportDto;
  readonly inventoryValue: readonly InventoryValueReportRowDto[];
  readonly lowStock: readonly LowStockReportRowDto[];
  readonly receivables: readonly ReceivableReportRowDto[];
  readonly payables: readonly PayableReportRowDto[];
};

export type CustomerStatusFilter = "active" | "archived" | "all";

export type CustomerType = "walk-in" | "regular" | "wholesale" | "vip";

export type CustomerSortBy =
  "name" | "phone" | "city" | "balance" | "creditLimit" | "lastPurchase" | "status" | "createdAt";

export type CustomerSummaryDto = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly city: string | null;
  readonly balanceMinor: number;
};

export type CustomerListRequest = {
  readonly search?: string;
  readonly status?: CustomerStatusFilter;
  readonly customerType?: CustomerType | "all";
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: CustomerSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type CustomerListItemDto = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly cnic: string | null;
  readonly tags: readonly string[];
  readonly customerType: CustomerType;
  readonly outstandingBalanceMinor: number;
  readonly creditLimitMinor: number;
  readonly lastPurchaseAt: string | null;
  readonly status: "active" | "archived";
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
};

export type CustomerPageDto = {
  readonly items: readonly CustomerListItemDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type CustomerDetailDto = CustomerListItemDto & {
  readonly notes: string | null;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
};

export type CustomerWritePayload = {
  readonly id?: string;
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly cnic?: string | null;
  readonly tags: readonly string[];
  readonly customerType: CustomerType;
  readonly creditLimitMinor: number;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate?: string | null;
  readonly notes?: string | null;
  readonly expectedUpdatedAt?: string | null;
};

export type CustomerStatementRequest = {
  readonly customerId: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly transactionType?: "all" | "opening-balance" | "payment" | "sale";
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
};

export type CustomerStatementLineDto = {
  readonly id: string;
  readonly date: string;
  readonly reference: string;
  readonly transactionType: string;
  readonly description: string;
  readonly debitMinor: number;
  readonly creditMinor: number;
  readonly runningBalanceMinor: number;
  readonly userName: string;
};

export type CustomerStatementDto = {
  readonly customer: CustomerDetailDto;
  readonly openingBalanceMinor: number;
  readonly closingBalanceMinor: number;
  readonly generatedAt: string;
  readonly preparedBy: string;
  readonly items: readonly CustomerStatementLineDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type CustomerPaymentPayload = {
  readonly customerId: string;
  readonly amountMinor: number;
  readonly paymentMethod: "cash" | "bank" | "jazzcash" | "easypaisa" | "card";
  readonly paidAt: string;
  readonly referenceNumber?: string | null;
  readonly receiptNumber?: string | null;
  readonly notes?: string | null;
};

export type CustomerPaymentDto = {
  readonly id: string;
  readonly customerId: string;
  readonly paymentNumber: string;
  readonly amountMinor: number;
  readonly paidAt: string;
  readonly method: string;
  readonly notes: string | null;
};

export type CustomerActivityDto = {
  readonly id: string;
  readonly action: string;
  readonly occurredAt: string;
  readonly userName: string;
  readonly details: string | null;
};

export type CustomerIpcError = {
  readonly code: string;
  readonly message: string;
  readonly fields?: readonly string[];
};

export type SupplierStatusFilter = "active" | "archived" | "all";

export type SupplierSortBy =
  "name" | "phone" | "city" | "balance" | "lastPurchase" | "status" | "createdAt";

export type SupplierSummaryDto = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly city: string | null;
  readonly balanceMinor: number;
};

export type SupplierListRequest = {
  readonly search?: string;
  readonly status?: SupplierStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: SupplierSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type SupplierListItemDto = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly ntn: string | null;
  readonly strn: string | null;
  readonly tags: readonly string[];
  readonly creditTerms: string | null;
  readonly outstandingBalanceMinor: number;
  readonly lastPurchaseAt: string | null;
  readonly status: "active" | "archived";
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
};

export type SupplierPageDto = {
  readonly items: readonly SupplierListItemDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type SupplierDetailDto = SupplierListItemDto & {
  readonly notes: string | null;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
};

export type SupplierWritePayload = {
  readonly id?: string;
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly ntn?: string | null;
  readonly strn?: string | null;
  readonly tags: readonly string[];
  readonly creditTerms?: string | null;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate?: string | null;
  readonly notes?: string | null;
  readonly expectedUpdatedAt?: string | null;
};

export type SupplierStatementRequest = {
  readonly supplierId: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly transactionType?: "all" | "opening-balance" | "payment" | "purchase";
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
};

export type SupplierStatementLineDto = {
  readonly id: string;
  readonly date: string;
  readonly reference: string;
  readonly transactionType: string;
  readonly description: string;
  readonly debitMinor: number;
  readonly creditMinor: number;
  readonly runningBalanceMinor: number;
  readonly userName: string;
};

export type SupplierStatementDto = {
  readonly supplier: SupplierDetailDto;
  readonly openingBalanceMinor: number;
  readonly closingBalanceMinor: number;
  readonly generatedAt: string;
  readonly preparedBy: string;
  readonly items: readonly SupplierStatementLineDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type SupplierPaymentPayload = {
  readonly supplierId: string;
  readonly amountMinor: number;
  readonly paymentMethod: "cash" | "bank" | "jazzcash" | "easypaisa" | "card";
  readonly paidAt: string;
  readonly referenceNumber?: string | null;
  readonly receiptNumber?: string | null;
  readonly notes?: string | null;
};

export type SupplierPaymentDto = {
  readonly id: string;
  readonly supplierId: string;
  readonly paymentNumber: string;
  readonly amountMinor: number;
  readonly paidAt: string;
  readonly method: string;
  readonly notes: string | null;
};

export type SupplierActivityDto = {
  readonly id: string;
  readonly action: string;
  readonly occurredAt: string;
  readonly userName: string;
  readonly details: string | null;
};

export type PurchaseStatusFilter = "draft" | "received" | "cancelled" | "all";

export type PurchaseSortBy =
  "purchaseNumber" | "supplier" | "purchaseDate" | "dueDate" | "total" | "status" | "createdAt";

export type PurchaseItemPayload = {
  readonly id?: string;
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
};

export type PurchaseWritePayload = {
  readonly id?: string;
  readonly supplierId: string;
  readonly invoiceNumber?: string | null;
  readonly purchaseNumber?: string | null;
  readonly purchaseDate: string;
  readonly dueDate?: string | null;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly freightMinor: number;
  readonly otherChargesMinor: number;
  readonly notes?: string | null;
  readonly items: readonly PurchaseItemPayload[];
  readonly expectedUpdatedAt?: string | null;
};

export type PurchaseListRequest = {
  readonly search?: string;
  readonly supplierId?: string;
  readonly status?: PurchaseStatusFilter;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: PurchaseSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type PurchaseListItemDto = {
  readonly id: string;
  readonly purchaseNumber: string;
  readonly invoiceNumber: string | null;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly purchaseDate: string;
  readonly dueDate: string | null;
  readonly itemCount: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly paymentStatus: "unpaid" | "partial" | "paid";
  readonly status: "draft" | "received" | "cancelled";
  readonly receivedAt: string | null;
  readonly cancelledAt: string | null;
  readonly updatedAt: string | null;
};

export type PurchasePageDto = {
  readonly items: readonly PurchaseListItemDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type PurchaseItemDto = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly lineTotalMinor: number;
  readonly returnedQuantity: number;
};

export type PurchaseDetailDto = PurchaseListItemDto & {
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly freightMinor: number;
  readonly otherChargesMinor: number;
  readonly notes: string | null;
  readonly items: readonly PurchaseItemDto[];
  readonly createdAt: string;
  readonly createdByUserId: string;
};

export type PurchaseReturnItemPayload = {
  readonly purchaseItemId: string;
  readonly quantity: number;
};

export type PurchaseReturnPayload = {
  readonly purchaseId: string;
  readonly reason: string;
  readonly items: readonly PurchaseReturnItemPayload[];
};

export type PurchaseReturnItemDto = {
  readonly id: string;
  readonly purchaseItemId: string;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly lineTotalMinor: number;
};

export type PurchaseReturnDto = {
  readonly id: string;
  readonly returnNumber: string;
  readonly purchaseId: string;
  readonly purchaseNumber: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly reason: string;
  readonly totalValueMinor: number;
  readonly payableReductionMinor: number;
  readonly returnedAt: string;
  readonly items: readonly PurchaseReturnItemDto[];
};

export type SupplierIpcError = {
  readonly code: string;
  readonly message: string;
  readonly fields?: readonly string[];
};

export type SaleStatusFilter = "draft" | "held" | "completed" | "cancelled" | "all";
export type SalePaymentType = "cash" | "credit" | "mixed";
export type SaleSortBy = "saleNumber" | "saleDate" | "customer" | "total" | "status" | "createdAt";

export type SaleItemPayload = {
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
};

export type SaleWritePayload = {
  readonly operationId?: string;
  readonly id?: string;
  readonly customerId?: string | null;
  readonly saleNumber?: string | null;
  readonly saleDate: string;
  readonly paymentType: SalePaymentType;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly cashReceivedMinor: number;
  readonly notes?: string | null;
  readonly holdReason?: string | null;
  readonly items: readonly SaleItemPayload[];
  readonly expectedUpdatedAt?: string | null;
};

export type SaleListRequest = {
  readonly search?: string;
  readonly customerId?: string;
  readonly status?: SaleStatusFilter;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: SaleSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type SaleListItemDto = {
  readonly returnStatus: "none" | "partial" | "full";
  readonly refundedMinor: number;
  readonly netTotalMinor: number;

  readonly id: string;
  readonly saleNumber: string;
  readonly customerId: string | null;
  readonly customerName: string | null;
  readonly saleDate: string;
  readonly itemCount: number;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly changeDueMinor: number;
  readonly paymentType: SalePaymentType;
  readonly status: "draft" | "held" | "completed" | "cancelled";
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly updatedAt: string | null;
};

export type SaleItemDto = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly barcode: string | null;
  readonly unitId: string;
  readonly unitName: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly lineTotalMinor: number;
  readonly returnedQuantity: number;
};

export type SaleDetailDto = SaleListItemDto & {
  readonly taxMinor: number;
  readonly notes: string | null;
  readonly holdReason: string | null;
  readonly items: readonly SaleItemDto[];
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly cashierName: string;
};

export type SalePageDto = {
  readonly items: readonly SaleListItemDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type ReceiptLineItemDto = {
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
};

export type ReceiptDto = {
  readonly saleId: string;
  readonly saleNumber: string;
  readonly saleDate: string;
  readonly cashierName: string;
  readonly customerName: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly changeDueMinor: number;
  readonly paymentType: SalePaymentType;
  readonly items: readonly ReceiptLineItemDto[];
};

export type SaleReturnRefundMethod = "cash" | "customer-credit";
export type SaleReturnCondition = "sellable" | "damaged";

export type SaleReturnItemPayload = {
  readonly saleItemId: string;
  readonly quantity: number;
  readonly condition: SaleReturnCondition;
};

export type SaleReturnPayload = {
  readonly saleId: string;
  readonly reason: string;
  readonly refundMethod: SaleReturnRefundMethod;
  readonly items: readonly SaleReturnItemPayload[];
};

export type SaleReturnItemDto = {
  readonly id: string;
  readonly saleItemId: string;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly condition: SaleReturnCondition;
  readonly restockAction: "return-to-stock" | "do-not-restock";
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
};

export type SaleReturnDto = {
  readonly id: string;
  readonly returnNumber: string;
  readonly saleId: string;
  readonly saleNumber: string;
  readonly customerId: string | null;
  readonly customerName: string | null;
  readonly reason: string;
  readonly refundMethod: SaleReturnRefundMethod;
  readonly totalRefundMinor: number;
  readonly cashRefundMinor: number;
  readonly receivableReductionMinor: number;
  readonly returnedAt: string;
  readonly items: readonly SaleReturnItemDto[];
};

export type CashRegisterDto = {
  readonly openingCashMinor: number;
  readonly cashSalesMinor: number;
  readonly customerPaymentsMinor: number;
  readonly expensesMinor: number;
  readonly expectedCashMinor: number;
  readonly salesCount: number;
  readonly averageSaleMinor: number;
};

export type SalesDashboardDto = {
  readonly todayRevenueMinor: number;
  readonly todayProfitMinor: number | null;
  readonly salesCount: number;
  readonly averageSaleMinor: number;
  readonly bestSellingProducts: readonly {
    readonly productId: string;
    readonly productName: string;
    readonly quantity: number;
    readonly revenueMinor: number;
  }[];
  readonly bestCustomers: readonly {
    readonly customerId: string;
    readonly customerName: string;
    readonly revenueMinor: number;
  }[];
  readonly recentSales: readonly SaleListItemDto[];
};

export type SaleIpcError = {
  readonly code: string;
  readonly message: string;
  readonly fields?: readonly string[];
};

export type InventoryStatusFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

export type InventorySortBy =
  | "barcode"
  | "sku"
  | "product"
  | "category"
  | "currentStock"
  | "minimumStock"
  | "purchasePrice"
  | "retailPrice"
  | "inventoryValue"
  | "status";

export type InventoryListRequest = {
  readonly search?: string;
  readonly status?: InventoryStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: InventorySortBy;
  readonly sortDirection: "asc" | "desc";
};

export type InventoryItemDto = {
  readonly productId: string;
  readonly barcode: string | null;
  readonly sku: string | null;
  readonly productName: string;
  readonly categoryName: string | null;
  readonly supplierName: string | null;
  readonly currentStock: number;
  readonly reservedStock: number;
  readonly availableStock: number;
  readonly minimumStock: number;
  readonly maximumStock: number | null;
  readonly purchasePriceMinor: number;
  readonly retailPriceMinor: number;
  readonly inventoryValuePurchaseMinor: number;
  readonly inventoryValueRetailMinor: number;
  readonly status: "in-stock" | "low-stock" | "out-of-stock";
};

export type InventoryPageDto = {
  readonly items: readonly InventoryItemDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type InventoryOverviewDto = {
  readonly totalProducts: number;
  readonly productsInStock: number;
  readonly lowStock: number;
  readonly outOfStock: number;
  readonly inventoryValuePurchaseMinor: number;
  readonly inventoryValueRetailMinor: number;
  readonly totalInventoryQuantity: number;
  readonly recentMovements: readonly InventoryMovementDto[];
};

export type InventoryMovementReason =
  | "opening-stock"
  | "damaged"
  | "expired"
  | "lost"
  | "found"
  | "manual-correction"
  | "stock-count-difference"
  | "supplier-replacement";

export type InventoryMovementDto = {
  readonly id: string;
  readonly date: string;
  readonly productId: string;
  readonly productName: string;
  readonly reason: string;
  readonly direction: "in" | "out";
  readonly quantity: number;
  readonly beforeQuantity: number;
  readonly afterQuantity: number;
  readonly userName: string;
  readonly reference: string;
  readonly notes: string | null;
  readonly unitCostMinor: number | null;
};

export type InventoryMovementListRequest = {
  readonly productId?: string;
  readonly reason?: string;
  readonly userId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page: number;
  readonly pageSize: number;
};

export type InventoryMovementPageDto = {
  readonly items: readonly InventoryMovementDto[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type InventoryAdjustmentPayload = {
  readonly productId: string;
  readonly direction: "increase" | "decrease";
  readonly quantity: number;
  readonly unitCostMinor?: number | null;
  readonly reason: InventoryMovementReason;
  readonly occurredAt: string;
  readonly notes?: string | null;
};

export type OpeningStockEntryPayload = {
  readonly productId: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly occurredAt: string;
  readonly notes?: string | null;
};

export type OpeningStockBulkPayload = {
  readonly entries: readonly OpeningStockEntryPayload[];
};

export type StockTakeScope = "full" | "partial";
export type StockTakeStatus = "draft" | "completed" | "cancelled";

export type StockTakeListItemDto = {
  readonly id: string;
  readonly countNumber: string;
  readonly scopeType: StockTakeScope;
  readonly status: StockTakeStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly itemCount: number;
  readonly varianceCount: number;
  readonly notes: string | null;
};

export type StockTakeItemDto = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly barcode: string | null;
  readonly sku: string | null;
  readonly expectedQuantity: number;
  readonly countedQuantity: number | null;
  readonly varianceQuantity: number | null;
  readonly adjustmentInventoryTransactionId: string | null;
};

export type StockTakeDetailDto = StockTakeListItemDto & {
  readonly items: readonly StockTakeItemDto[];
  readonly createdByUserId: string;
  readonly completedByUserId: string | null;
};

export type StockTakeStartPayload = {
  readonly scopeType: StockTakeScope;
  readonly productIds: readonly string[];
  readonly startedAt: string;
  readonly notes?: string | null;
};

export type StockTakeCompletePayload = {
  readonly countId: string;
  readonly completedAt: string;
  readonly counts: readonly {
    readonly productId: string;
    readonly countedQuantity: number;
  }[];
};

export type InventoryIpcError = {
  readonly code: string;
  readonly message: string;
  readonly fields?: readonly string[];
};

export type ProductListContract = IpcContract<
  "orix:products.list",
  ProductListRequest,
  ProductPageDto,
  ProductIpcError
>;

export type ProductGetContract = IpcContract<
  "orix:products.get",
  { readonly id: string },
  ProductDetailDto | undefined,
  ProductIpcError
>;

export type ProductSaveContract = IpcContract<
  "orix:products.save",
  ProductFormPayload,
  { readonly product: ProductDetailDto },
  ProductIpcError
>;

export type ProductArchiveContract = IpcContract<
  "orix:products.archive",
  { readonly id: string },
  { readonly archived: true },
  ProductIpcError
>;

export type ProductRestoreContract = IpcContract<
  "orix:products.restore",
  { readonly id: string },
  { readonly restored: true },
  ProductIpcError
>;

export type ProductCatalogGetContract = IpcContract<
  "orix:products.catalog",
  { readonly includeArchived?: boolean },
  ProductCatalogDto,
  ProductIpcError
>;

export type ProductCatalogSaveContract = IpcContract<
  "orix:products.catalog.save",
  CatalogWritePayload,
  { readonly item: CatalogItemDto },
  ProductIpcError
>;

export type ProductCatalogArchiveContract = IpcContract<
  "orix:products.catalog.archive",
  { readonly id: string; readonly kind: CatalogItemKind },
  { readonly archived: true },
  ProductIpcError
>;

export type ProductCatalogRestoreContract = IpcContract<
  "orix:products.catalog.restore",
  { readonly id: string; readonly kind: CatalogItemKind },
  { readonly restored: true },
  ProductIpcError
>;

export type AppContextContract = IpcContract<
  "orix:app.context",
  Record<string, never>,
  AppContextDto,
  AppIpcError
>;

export type DashboardGetContract = IpcContract<
  "orix:dashboard.get",
  Record<string, never>,
  DashboardDto,
  AppIpcError
>;

export type SettingsGetContract = IpcContract<
  "orix:settings.get",
  Record<string, never>,
  AppSettingsDto,
  AppIpcError
>;

export type SettingsSaveContract = IpcContract<
  "orix:settings.save",
  AppSettingsDto,
  AppSettingsDto,
  AppIpcError
>;

export type BackupStatusContract = IpcContract<
  "orix:backups.status",
  Record<string, never>,
  BackupStatusDto,
  AppIpcError
>;

export type BackupCreateContract = IpcContract<
  "orix:backups.create",
  Record<string, never>,
  BackupRecordDto,
  AppIpcError
>;

export type BackupSelectDirectoryContract = IpcContract<
  "orix:backups.select-directory",
  Record<string, never>,
  BackupDirectorySelectionDto,
  AppIpcError
>;

export type BackupSelectFileContract = IpcContract<
  "orix:backups.select-file",
  Record<string, never>,
  BackupFileSelectionDto,
  AppIpcError
>;

export type BackupVerifyContract = IpcContract<
  "orix:backups.verify",
  { readonly filePath: string },
  BackupVerificationDto,
  AppIpcError
>;

export type BackupRestoreContract = IpcContract<
  "orix:backups.restore",
  RestoreBackupPayload,
  RestoreBackupDto,
  AppIpcError
>;

export type LegacyStockImportSelectFilesContract = IpcContract<
  "orix:migration.legacy-stock.select-files",
  Record<string, never>,
  LegacyStockImportFilesDto,
  MigrationIpcError
>;

export type LegacyStockImportPreviewContract = IpcContract<
  "orix:migration.legacy-stock.preview",
  LegacyStockImportPreviewPayload,
  LegacyStockImportPreviewDto,
  MigrationIpcError
>;

export type LegacyStockImportContract = IpcContract<
  "orix:migration.legacy-stock.import",
  LegacyStockImportPayload,
  LegacyStockImportResultDto,
  MigrationIpcError
>;

export type AuthStatusContract = IpcContract<
  "orix:auth.status",
  Record<string, never>,
  AuthStatusDto,
  AppIpcError
>;

export type SetupStoreContract = IpcContract<
  "orix:setup.store",
  SetupStorePayload,
  AuthStatusDto,
  AppIpcError
>;

export type LoginContract = IpcContract<
  "orix:auth.login",
  LoginPayload,
  AuthStatusDto,
  AppIpcError
>;

export type LockContract = IpcContract<
  "orix:auth.lock",
  Record<string, never>,
  AuthStatusDto,
  AppIpcError
>;

export type UnlockContract = IpcContract<
  "orix:auth.unlock",
  UnlockPayload,
  AuthStatusDto,
  AppIpcError
>;

export type LogoutContract = IpcContract<
  "orix:auth.logout",
  Record<string, never>,
  AuthStatusDto,
  AppIpcError
>;

export type UsersListContract = IpcContract<
  "orix:users.list",
  { readonly search?: string; readonly status?: "all" | "active" | "disabled" },
  UserManagementListDto,
  AppIpcError
>;

export type UserSaveContract = IpcContract<
  "orix:users.save",
  UserSavePayload,
  { readonly user: AuthUserDto },
  AppIpcError
>;

export type UserResetSecretContract = IpcContract<
  "orix:users.reset-secret",
  ResetSecretPayload,
  { readonly reset: true },
  AppIpcError
>;

export type InventoryOverviewContract = IpcContract<
  "orix:inventory.overview",
  Record<string, never>,
  InventoryOverviewDto,
  InventoryIpcError
>;

export type InventoryListContract = IpcContract<
  "orix:inventory.list",
  InventoryListRequest,
  InventoryPageDto,
  InventoryIpcError
>;

export type InventoryMovementsContract = IpcContract<
  "orix:inventory.movements",
  InventoryMovementListRequest,
  InventoryMovementPageDto,
  InventoryIpcError
>;

export type InventoryAdjustContract = IpcContract<
  "orix:inventory.adjust",
  InventoryAdjustmentPayload,
  { readonly transactionId: string },
  InventoryIpcError
>;

export type InventoryOpeningStockContract = IpcContract<
  "orix:inventory.opening-stock",
  OpeningStockBulkPayload,
  { readonly transactionIds: readonly string[] },
  InventoryIpcError
>;

export type InventoryStockTakesContract = IpcContract<
  "orix:inventory.stock-takes",
  Record<string, never>,
  { readonly items: readonly StockTakeListItemDto[] },
  InventoryIpcError
>;

export type InventoryStockTakeGetContract = IpcContract<
  "orix:inventory.stock-take.get",
  { readonly id: string },
  StockTakeDetailDto | undefined,
  InventoryIpcError
>;

export type InventoryStockTakeStartContract = IpcContract<
  "orix:inventory.stock-take.start",
  StockTakeStartPayload,
  { readonly stockTake: StockTakeDetailDto },
  InventoryIpcError
>;

export type InventoryStockTakeCompleteContract = IpcContract<
  "orix:inventory.stock-take.complete",
  StockTakeCompletePayload,
  { readonly stockTake: StockTakeDetailDto },
  InventoryIpcError
>;

export type CustomerListContract = IpcContract<
  "orix:customers.list",
  CustomerListRequest,
  CustomerPageDto,
  CustomerIpcError
>;

export type CustomerGetContract = IpcContract<
  "orix:customers.get",
  { readonly id: string },
  CustomerDetailDto | undefined,
  CustomerIpcError
>;

export type CustomerSaveContract = IpcContract<
  "orix:customers.save",
  CustomerWritePayload,
  { readonly customer: CustomerDetailDto },
  CustomerIpcError
>;

export type CustomerArchiveContract = IpcContract<
  "orix:customers.archive",
  { readonly id: string },
  { readonly archived: true },
  CustomerIpcError
>;

export type CustomerRestoreContract = IpcContract<
  "orix:customers.restore",
  { readonly id: string },
  { readonly restored: true },
  CustomerIpcError
>;

export type CustomerStatementContract = IpcContract<
  "orix:customers.statement",
  CustomerStatementRequest,
  CustomerStatementDto,
  CustomerIpcError
>;

export type CustomerPaymentRecordContract = IpcContract<
  "orix:customers.payment.record",
  CustomerPaymentPayload,
  { readonly payment: CustomerPaymentDto },
  CustomerIpcError
>;

export type CustomerActivityContract = IpcContract<
  "orix:customers.activity",
  { readonly customerId: string },
  { readonly items: readonly CustomerActivityDto[] },
  CustomerIpcError
>;

export type SupplierListContract = IpcContract<
  "orix:suppliers.list",
  SupplierListRequest,
  SupplierPageDto,
  SupplierIpcError
>;

export type SupplierGetContract = IpcContract<
  "orix:suppliers.get",
  { readonly id: string },
  SupplierDetailDto | undefined,
  SupplierIpcError
>;

export type SupplierSaveContract = IpcContract<
  "orix:suppliers.save",
  SupplierWritePayload,
  { readonly supplier: SupplierDetailDto },
  SupplierIpcError
>;

export type SupplierArchiveContract = IpcContract<
  "orix:suppliers.archive",
  { readonly id: string },
  { readonly archived: true },
  SupplierIpcError
>;

export type SupplierRestoreContract = IpcContract<
  "orix:suppliers.restore",
  { readonly id: string },
  { readonly restored: true },
  SupplierIpcError
>;

export type SupplierStatementContract = IpcContract<
  "orix:suppliers.statement",
  SupplierStatementRequest,
  SupplierStatementDto,
  SupplierIpcError
>;

export type SupplierPaymentRecordContract = IpcContract<
  "orix:suppliers.payment.record",
  SupplierPaymentPayload,
  { readonly payment: SupplierPaymentDto },
  SupplierIpcError
>;

export type SupplierActivityContract = IpcContract<
  "orix:suppliers.activity",
  { readonly supplierId: string },
  { readonly items: readonly SupplierActivityDto[] },
  SupplierIpcError
>;

export type PurchaseListContract = IpcContract<
  "orix:purchases.list",
  PurchaseListRequest,
  PurchasePageDto,
  SupplierIpcError
>;

export type PurchaseGetContract = IpcContract<
  "orix:purchases.get",
  { readonly id: string },
  PurchaseDetailDto | undefined,
  SupplierIpcError
>;

export type PurchaseSaveDraftContract = IpcContract<
  "orix:purchases.save-draft",
  PurchaseWritePayload,
  { readonly purchase: PurchaseDetailDto },
  SupplierIpcError
>;

export type PurchaseReceiveContract = IpcContract<
  "orix:purchases.receive",
  { readonly id: string },
  { readonly purchase: PurchaseDetailDto },
  SupplierIpcError
>;

export type PurchaseCancelContract = IpcContract<
  "orix:purchases.cancel",
  { readonly id: string; readonly reason: string },
  { readonly cancelled: true },
  SupplierIpcError
>;

export type PurchaseReturnContract = IpcContract<
  "orix:purchases.return",
  PurchaseReturnPayload,
  { readonly return: PurchaseReturnDto },
  SupplierIpcError
>;

export type SaleListContract = IpcContract<
  "orix:sales.list",
  SaleListRequest,
  SalePageDto,
  SaleIpcError
>;

export type SaleGetContract = IpcContract<
  "orix:sales.get",
  { readonly id: string },
  SaleDetailDto | undefined,
  SaleIpcError
>;

export type SaleSaveDraftContract = IpcContract<
  "orix:sales.save-draft",
  SaleWritePayload,
  { readonly sale: SaleDetailDto; readonly receipt: ReceiptDto | null },
  SaleIpcError
>;

export type SaleHoldContract = IpcContract<
  "orix:sales.hold",
  SaleWritePayload,
  { readonly sale: SaleDetailDto; readonly receipt: ReceiptDto | null },
  SaleIpcError
>;

export type SaleCompleteContract = IpcContract<
  "orix:sales.complete",
  SaleWritePayload,
  { readonly sale: SaleDetailDto; readonly receipt: ReceiptDto | null },
  SaleIpcError
>;

export type SaleCancelContract = IpcContract<
  "orix:sales.cancel",
  { readonly id: string; readonly reason: string },
  { readonly cancelled: true },
  SaleIpcError
>;

export type SaleReturnContract = IpcContract<
  "orix:sales.return",
  SaleReturnPayload,
  { readonly return: SaleReturnDto },
  SaleIpcError
>;

export type SaleReceiptContract = IpcContract<
  "orix:sales.receipt",
  { readonly saleId: string },
  ReceiptDto,
  SaleIpcError
>;

export type CashRegisterContract = IpcContract<
  "orix:cash-register.summary",
  Record<string, never>,
  CashRegisterDto,
  SaleIpcError
>;

export type SalesDashboardContract = IpcContract<
  "orix:sales.dashboard",
  Record<string, never>,
  SalesDashboardDto,
  SaleIpcError
>;

export type ReportsSummaryContract = IpcContract<
  "orix:reports.summary",
  ReportRequest,
  ReportsSummaryDto,
  AppIpcError
>;

export type OrixIpcContract =
  | SystemHealthContract
  | AppContextContract
  | DashboardGetContract
  | SettingsGetContract
  | SettingsSaveContract
  | LegacyStockImportSelectFilesContract
  | LegacyStockImportPreviewContract
  | LegacyStockImportContract
  | AuthStatusContract
  | SetupStoreContract
  | LoginContract
  | LockContract
  | UnlockContract
  | LogoutContract
  | UsersListContract
  | UserSaveContract
  | UserResetSecretContract
  | InventoryOverviewContract
  | InventoryListContract
  | InventoryMovementsContract
  | InventoryAdjustContract
  | InventoryOpeningStockContract
  | InventoryStockTakesContract
  | InventoryStockTakeGetContract
  | InventoryStockTakeStartContract
  | InventoryStockTakeCompleteContract
  | CustomerListContract
  | CustomerGetContract
  | CustomerSaveContract
  | CustomerArchiveContract
  | CustomerRestoreContract
  | CustomerStatementContract
  | CustomerPaymentRecordContract
  | CustomerActivityContract
  | SupplierListContract
  | SupplierGetContract
  | SupplierSaveContract
  | SupplierArchiveContract
  | SupplierRestoreContract
  | SupplierStatementContract
  | SupplierPaymentRecordContract
  | SupplierActivityContract
  | PurchaseListContract
  | PurchaseGetContract
  | PurchaseSaveDraftContract
  | PurchaseReceiveContract
  | PurchaseCancelContract
  | PurchaseReturnContract
  | SaleListContract
  | SaleGetContract
  | SaleSaveDraftContract
  | SaleHoldContract
  | SaleCompleteContract
  | SaleCancelContract
  | SaleReturnContract
  | SaleReceiptContract
  | CashRegisterContract
  | SalesDashboardContract
  | ProductListContract
  | ProductGetContract
  | ProductSaveContract
  | ProductArchiveContract
  | ProductRestoreContract
  | ProductCatalogGetContract
  | ProductCatalogSaveContract
  | ProductCatalogArchiveContract
  | ProductCatalogRestoreContract;

export type CounterSummaryDto = {
  readonly backupWarning?: string;
  readonly session: {
    readonly id: string;
    readonly status: string;
    readonly openingCashMinor: number;
    readonly expectedCashMinor: number | null;
    readonly countedCashMinor: number | null;
    readonly varianceMinor: number | null;
    readonly openedAt: string;
    readonly closedAt: string | null;
    readonly notes: string | null;
  } | null;
  readonly expectedCashMinor: number;
  readonly expenses: readonly {
    readonly id: string;
    readonly description: string;
    readonly amountMinor: number;
    readonly expenseDate: string;
    readonly status: string;
  }[];
};
export type CounterSummaryContract = IpcContract<
  "orix:counter.summary",
  Record<string, never>,
  CounterSummaryDto,
  AppIpcError
>;
export type CounterOpenContract = IpcContract<
  "orix:counter.open",
  { readonly openingCashMinor: number },
  CounterSummaryDto,
  AppIpcError
>;
export type CounterCloseContract = IpcContract<
  "orix:counter.close",
  { readonly countedCashMinor: number; readonly reason: string },
  CounterSummaryDto,
  AppIpcError
>;
export type CounterExpenseContract = IpcContract<
  "orix:counter.expense",
  { readonly amountMinor: number; readonly description: string; readonly operationId: string },
  CounterSummaryDto,
  AppIpcError
>;

export type DiagnosticsStatusDto = {
  readonly appVersion: string;
  readonly buildId: string;
  readonly platform: string;
  readonly arch: string;
  readonly osRelease: string;
  readonly electron: string;
  readonly node: string;
  readonly previousUncleanShutdown: boolean;
  readonly loggingAvailable: boolean;
};
export type DiagnosticsStatusContract = IpcContract<
  "orix:diagnostics.status",
  Record<string, never>,
  DiagnosticsStatusDto,
  AppIpcError
>;
export type DiagnosticsNoticeContract = IpcContract<
  "orix:diagnostics.notice",
  Record<string, never>,
  Pick<DiagnosticsStatusDto, "previousUncleanShutdown" | "loggingAvailable">,
  AppIpcError
>;
export type DiagnosticsExportContract = IpcContract<
  "orix:diagnostics.export",
  Record<string, never>,
  { readonly filePath: string | null },
  AppIpcError
>;
export type DiagnosticsReportContract = IpcContract<
  "orix:diagnostics.report",
  {
    readonly kind: "error" | "unhandled-rejection" | "react";
    readonly name?: string;
    readonly stack?: string;
  },
  { readonly recorded: boolean },
  AppIpcError
>;
