import type {
  CatalogItemKind,
  CatalogWritePayload,
  IpcChannel,
  IpcRequest,
  AppContextContract,
  DashboardGetContract,
  AuthStatusContract,
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
  SettingsGetContract,
  SettingsSaveContract,
  AppSettingsDto,
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
  UsersListContract
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
  dashboard: dashboardApi,
  inventory: inventoryApi,
  settings: settingsApi,
  products: productApi,
  users: usersApi
});

export type OrixPreloadApi = {
  readonly app: typeof appApi;
  readonly auth: typeof authApi;
  readonly dashboard: typeof dashboardApi;
  readonly inventory: typeof inventoryApi;
  readonly settings: typeof settingsApi;
  readonly products: typeof productApi;
  readonly users: typeof usersApi;
};
