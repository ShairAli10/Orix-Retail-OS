import type {
  CatalogItemKind,
  CatalogWritePayload,
  IpcChannel,
  IpcRequest,
  AppContextContract,
  AuthStatusContract,
  CustomerActivityContract,
  CustomerArchiveContract,
  CustomerGetContract,
  CustomerListContract,
  CustomerListRequest,
  CustomerPaymentPayload,
  CustomerPaymentRecordContract,
  CustomerRestoreContract,
  CustomerSaveContract,
  CustomerStatementContract,
  CustomerStatementRequest,
  CustomerWritePayload,
  DashboardGetContract,
  InventoryAdjustContract,
  InventoryAdjustmentPayload,
  InventoryListContract,
  InventoryListRequest,
  InventoryMovementsContract,
  InventoryMovementListRequest,
  InventoryOverviewContract,
  InventoryOpeningStockContract,
  OpeningStockBulkPayload,
  ProductArchiveContract,
  ProductCatalogArchiveContract,
  ProductCatalogGetContract,
  ProductCatalogRestoreContract,
  ProductCatalogSaveContract,
  ProductFormPayload,
  ProductGetContract,
  ProductListContract,
  ProductListRequest,
  ProductRestoreContract,
  ProductSaveContract,
  PurchaseCancelContract,
  PurchaseGetContract,
  PurchaseListContract,
  PurchaseListRequest,
  PurchaseReceiveContract,
  PurchaseSaveDraftContract,
  PurchaseWritePayload,
  CashRegisterContract,
  SaleCancelContract,
  SaleCompleteContract,
  SaleGetContract,
  SaleHoldContract,
  SaleListContract,
  SaleListRequest,
  SaleReceiptContract,
  SaleSaveDraftContract,
  SaleWritePayload,
  SalesDashboardContract,
  SettingsGetContract,
  SettingsSaveContract,
  AppSettingsDto,
  BackupCreateContract,
  BackupRestoreContract,
  BackupSelectDirectoryContract,
  BackupSelectFileContract,
  BackupStatusContract,
  BackupVerifyContract,
  LegacyStockImportContract,
  LegacyStockImportPayload,
  LegacyStockImportPreviewContract,
  LegacyStockImportPreviewPayload,
  LegacyStockImportSelectFilesContract,
  LoginContract,
  LoginPayload,
  LockContract,
  LogoutContract,
  ResetSecretPayload,
  SetupStoreContract,
  SetupStorePayload,
  UnlockContract,
  UnlockPayload,
  UserResetSecretContract,
  UserSaveContract,
  UserSavePayload,
  UsersListContract,
  SupplierActivityContract,
  SupplierArchiveContract,
  SupplierGetContract,
  SupplierListContract,
  SupplierListRequest,
  SupplierPaymentPayload,
  SupplierPaymentRecordContract,
  SupplierRestoreContract,
  SupplierSaveContract,
  SupplierStatementContract,
  SupplierStatementRequest,
  SupplierWritePayload
} from "@orix/electron";
import type * as Electron from "electron";

type ElectronPreloadRuntime = Pick<typeof Electron, "contextBridge" | "ipcRenderer">;

const electronRuntime = (
  globalThis as typeof globalThis & {
    readonly __orixElectron?: ElectronPreloadRuntime;
  }
).__orixElectron;

if (electronRuntime === undefined) {
  throw new Error("Electron preload runtime was not initialized.");
}

const { contextBridge, ipcRenderer } = electronRuntime;

const requestId = (): string => {
  const cryptoApi = globalThis.crypto as
    | {
        readonly randomUUID?: () => string;
      }
    | undefined;
  return cryptoApi?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36)}`;
};

const request = <TResult>(channel: IpcChannel, payload: object): Promise<TResult> =>
  ipcRenderer.invoke(channel, {
    requestId: requestId(),
    payload
  } satisfies IpcRequest<object>) as Promise<TResult>;

const productApi = {
  list: (payload: ProductListRequest): Promise<ProductListContract["response"]> =>
    request<ProductListContract["response"]>("orix:products.list", payload),
  get: (id: string): Promise<ProductGetContract["response"]> =>
    request<ProductGetContract["response"]>("orix:products.get", { id }),
  save: (payload: ProductFormPayload): Promise<ProductSaveContract["response"]> =>
    request<ProductSaveContract["response"]>("orix:products.save", payload),
  archive: (id: string): Promise<ProductArchiveContract["response"]> =>
    request<ProductArchiveContract["response"]>("orix:products.archive", { id }),
  restore: (id: string): Promise<ProductRestoreContract["response"]> =>
    request<ProductRestoreContract["response"]>("orix:products.restore", { id }),
  catalog: (includeArchived = true): Promise<ProductCatalogGetContract["response"]> =>
    request<ProductCatalogGetContract["response"]>("orix:products.catalog", { includeArchived }),
  saveCatalog: (payload: CatalogWritePayload): Promise<ProductCatalogSaveContract["response"]> =>
    request<ProductCatalogSaveContract["response"]>("orix:products.catalog.save", payload),
  archiveCatalog: (
    id: string,
    kind: CatalogItemKind
  ): Promise<ProductCatalogArchiveContract["response"]> =>
    request<ProductCatalogArchiveContract["response"]>("orix:products.catalog.archive", {
      id,
      kind
    }),
  restoreCatalog: (
    id: string,
    kind: CatalogItemKind
  ): Promise<ProductCatalogRestoreContract["response"]> =>
    request<ProductCatalogRestoreContract["response"]>("orix:products.catalog.restore", {
      id,
      kind
    })
};

const appApi = {
  context: (): Promise<AppContextContract["response"]> =>
    request<AppContextContract["response"]>("orix:app.context", {})
};

const authApi = {
  status: (): Promise<AuthStatusContract["response"]> =>
    request<AuthStatusContract["response"]>("orix:auth.status", {}),
  setupStore: (payload: SetupStorePayload): Promise<SetupStoreContract["response"]> =>
    request<SetupStoreContract["response"]>("orix:setup.store", payload),
  login: (payload: LoginPayload): Promise<LoginContract["response"]> =>
    request<LoginContract["response"]>("orix:auth.login", payload),
  lock: (): Promise<LockContract["response"]> =>
    request<LockContract["response"]>("orix:auth.lock", {}),
  unlock: (payload: UnlockPayload): Promise<UnlockContract["response"]> =>
    request<UnlockContract["response"]>("orix:auth.unlock", payload),
  logout: (): Promise<LogoutContract["response"]> =>
    request<LogoutContract["response"]>("orix:auth.logout", {})
};

const usersApi = {
  list: (
    payload: UsersListContract["request"]["payload"]
  ): Promise<UsersListContract["response"]> =>
    request<UsersListContract["response"]>("orix:users.list", payload),
  save: (payload: UserSavePayload): Promise<UserSaveContract["response"]> =>
    request<UserSaveContract["response"]>("orix:users.save", payload),
  resetSecret: (payload: ResetSecretPayload): Promise<UserResetSecretContract["response"]> =>
    request<UserResetSecretContract["response"]>("orix:users.reset-secret", payload)
};

const customersApi = {
  list: (payload: CustomerListRequest): Promise<CustomerListContract["response"]> =>
    request<CustomerListContract["response"]>("orix:customers.list", payload),
  get: (id: string): Promise<CustomerGetContract["response"]> =>
    request<CustomerGetContract["response"]>("orix:customers.get", { id }),
  save: (payload: CustomerWritePayload): Promise<CustomerSaveContract["response"]> =>
    request<CustomerSaveContract["response"]>("orix:customers.save", payload),
  archive: (id: string): Promise<CustomerArchiveContract["response"]> =>
    request<CustomerArchiveContract["response"]>("orix:customers.archive", { id }),
  restore: (id: string): Promise<CustomerRestoreContract["response"]> =>
    request<CustomerRestoreContract["response"]>("orix:customers.restore", { id }),
  statement: (payload: CustomerStatementRequest): Promise<CustomerStatementContract["response"]> =>
    request<CustomerStatementContract["response"]>("orix:customers.statement", payload),
  recordPayment: (
    payload: CustomerPaymentPayload
  ): Promise<CustomerPaymentRecordContract["response"]> =>
    request<CustomerPaymentRecordContract["response"]>("orix:customers.payment.record", payload),
  activity: (customerId: string): Promise<CustomerActivityContract["response"]> =>
    request<CustomerActivityContract["response"]>("orix:customers.activity", { customerId })
};

const suppliersApi = {
  list: (payload: SupplierListRequest): Promise<SupplierListContract["response"]> =>
    request<SupplierListContract["response"]>("orix:suppliers.list", payload),
  get: (id: string): Promise<SupplierGetContract["response"]> =>
    request<SupplierGetContract["response"]>("orix:suppliers.get", { id }),
  save: (payload: SupplierWritePayload): Promise<SupplierSaveContract["response"]> =>
    request<SupplierSaveContract["response"]>("orix:suppliers.save", payload),
  archive: (id: string): Promise<SupplierArchiveContract["response"]> =>
    request<SupplierArchiveContract["response"]>("orix:suppliers.archive", { id }),
  restore: (id: string): Promise<SupplierRestoreContract["response"]> =>
    request<SupplierRestoreContract["response"]>("orix:suppliers.restore", { id }),
  statement: (payload: SupplierStatementRequest): Promise<SupplierStatementContract["response"]> =>
    request<SupplierStatementContract["response"]>("orix:suppliers.statement", payload),
  recordPayment: (
    payload: SupplierPaymentPayload
  ): Promise<SupplierPaymentRecordContract["response"]> =>
    request<SupplierPaymentRecordContract["response"]>("orix:suppliers.payment.record", payload),
  activity: (supplierId: string): Promise<SupplierActivityContract["response"]> =>
    request<SupplierActivityContract["response"]>("orix:suppliers.activity", { supplierId })
};

const purchasesApi = {
  list: (payload: PurchaseListRequest): Promise<PurchaseListContract["response"]> =>
    request<PurchaseListContract["response"]>("orix:purchases.list", payload),
  get: (id: string): Promise<PurchaseGetContract["response"]> =>
    request<PurchaseGetContract["response"]>("orix:purchases.get", { id }),
  saveDraft: (payload: PurchaseWritePayload): Promise<PurchaseSaveDraftContract["response"]> =>
    request<PurchaseSaveDraftContract["response"]>("orix:purchases.save-draft", payload),
  receive: (id: string): Promise<PurchaseReceiveContract["response"]> =>
    request<PurchaseReceiveContract["response"]>("orix:purchases.receive", { id }),
  cancel: (id: string, reason: string): Promise<PurchaseCancelContract["response"]> =>
    request<PurchaseCancelContract["response"]>("orix:purchases.cancel", { id, reason })
};

const salesApi = {
  list: (payload: SaleListRequest): Promise<SaleListContract["response"]> =>
    request<SaleListContract["response"]>("orix:sales.list", payload),
  get: (id: string): Promise<SaleGetContract["response"]> =>
    request<SaleGetContract["response"]>("orix:sales.get", { id }),
  saveDraft: (payload: SaleWritePayload): Promise<SaleSaveDraftContract["response"]> =>
    request<SaleSaveDraftContract["response"]>("orix:sales.save-draft", payload),
  hold: (payload: SaleWritePayload): Promise<SaleHoldContract["response"]> =>
    request<SaleHoldContract["response"]>("orix:sales.hold", payload),
  complete: (payload: SaleWritePayload): Promise<SaleCompleteContract["response"]> =>
    request<SaleCompleteContract["response"]>("orix:sales.complete", payload),
  cancel: (id: string, reason: string): Promise<SaleCancelContract["response"]> =>
    request<SaleCancelContract["response"]>("orix:sales.cancel", { id, reason }),
  receipt: (saleId: string): Promise<SaleReceiptContract["response"]> =>
    request<SaleReceiptContract["response"]>("orix:sales.receipt", { saleId }),
  dashboard: (): Promise<SalesDashboardContract["response"]> =>
    request<SalesDashboardContract["response"]>("orix:sales.dashboard", {})
};

const cashRegisterApi = {
  summary: (): Promise<CashRegisterContract["response"]> =>
    request<CashRegisterContract["response"]>("orix:cash-register.summary", {})
};

const dashboardApi = {
  get: (): Promise<DashboardGetContract["response"]> =>
    request<DashboardGetContract["response"]>("orix:dashboard.get", {})
};

const settingsApi = {
  get: (): Promise<SettingsGetContract["response"]> =>
    request<SettingsGetContract["response"]>("orix:settings.get", {}),
  save: (payload: AppSettingsDto): Promise<SettingsSaveContract["response"]> =>
    request<SettingsSaveContract["response"]>("orix:settings.save", payload)
};

const backupsApi = {
  status: (): Promise<BackupStatusContract["response"]> =>
    request<BackupStatusContract["response"]>("orix:backups.status", {}),
  create: (): Promise<BackupCreateContract["response"]> =>
    request<BackupCreateContract["response"]>("orix:backups.create", {}),
  selectDirectory: (): Promise<BackupSelectDirectoryContract["response"]> =>
    request<BackupSelectDirectoryContract["response"]>("orix:backups.select-directory", {}),
  selectFile: (): Promise<BackupSelectFileContract["response"]> =>
    request<BackupSelectFileContract["response"]>("orix:backups.select-file", {}),
  verify: (filePath: string): Promise<BackupVerifyContract["response"]> =>
    request<BackupVerifyContract["response"]>("orix:backups.verify", { filePath }),
  restore: (
    payload: BackupRestoreContract["request"]["payload"]
  ): Promise<BackupRestoreContract["response"]> =>
    request<BackupRestoreContract["response"]>("orix:backups.restore", payload)
};

const migrationApi = {
  selectLegacyStockFiles: (): Promise<LegacyStockImportSelectFilesContract["response"]> =>
    request<LegacyStockImportSelectFilesContract["response"]>(
      "orix:migration.legacy-stock.select-files",
      {}
    ),
  previewLegacyStock: (
    payload: LegacyStockImportPreviewPayload
  ): Promise<LegacyStockImportPreviewContract["response"]> =>
    request<LegacyStockImportPreviewContract["response"]>(
      "orix:migration.legacy-stock.preview",
      payload
    ),
  importLegacyStock: (
    payload: LegacyStockImportPayload
  ): Promise<LegacyStockImportContract["response"]> =>
    request<LegacyStockImportContract["response"]>("orix:migration.legacy-stock.import", payload)
};

const inventoryApi = {
  overview: (): Promise<InventoryOverviewContract["response"]> =>
    request<InventoryOverviewContract["response"]>("orix:inventory.overview", {}),
  list: (payload: InventoryListRequest): Promise<InventoryListContract["response"]> =>
    request<InventoryListContract["response"]>("orix:inventory.list", payload),
  movements: (
    payload: InventoryMovementListRequest
  ): Promise<InventoryMovementsContract["response"]> =>
    request<InventoryMovementsContract["response"]>("orix:inventory.movements", payload),
  adjust: (payload: InventoryAdjustmentPayload): Promise<InventoryAdjustContract["response"]> =>
    request<InventoryAdjustContract["response"]>("orix:inventory.adjust", payload),
  openingStock: (
    payload: OpeningStockBulkPayload
  ): Promise<InventoryOpeningStockContract["response"]> =>
    request<InventoryOpeningStockContract["response"]>("orix:inventory.opening-stock", payload)
};

contextBridge.exposeInMainWorld("orix", {
  app: appApi,
  auth: authApi,
  backups: backupsApi,
  cashRegister: cashRegisterApi,
  customers: customersApi,
  dashboard: dashboardApi,
  inventory: inventoryApi,
  migration: migrationApi,
  settings: settingsApi,
  products: productApi,
  purchases: purchasesApi,
  sales: salesApi,
  suppliers: suppliersApi,
  users: usersApi
});

export type OrixPreloadApi = {
  readonly app: typeof appApi;
  readonly auth: typeof authApi;
  readonly backups: typeof backupsApi;
  readonly cashRegister: typeof cashRegisterApi;
  readonly customers: typeof customersApi;
  readonly dashboard: typeof dashboardApi;
  readonly inventory: typeof inventoryApi;
  readonly migration: typeof migrationApi;
  readonly settings: typeof settingsApi;
  readonly products: typeof productApi;
  readonly purchases: typeof purchasesApi;
  readonly sales: typeof salesApi;
  readonly suppliers: typeof suppliersApi;
  readonly users: typeof usersApi;
};
