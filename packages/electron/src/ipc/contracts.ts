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

export type AppContextDto = {
  readonly storeName: string;
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
  | "suppliers.view"
  | "purchases.view"
  | "sales.view"
  | "expenses.view"
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
  readonly topSellingProductName: string | null;
  readonly recentActivity: readonly RecentActivityDto[];
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

export type OrixIpcContract =
  | SystemHealthContract
  | AppContextContract
  | DashboardGetContract
  | SettingsGetContract
  | SettingsSaveContract
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
  | ProductListContract
  | ProductGetContract
  | ProductSaveContract
  | ProductArchiveContract
  | ProductRestoreContract
  | ProductCatalogGetContract
  | ProductCatalogSaveContract
  | ProductCatalogArchiveContract
  | ProductCatalogRestoreContract;
