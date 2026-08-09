import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ApplicationEvent,
  CoreError,
  CoreResult,
  EventPublisher,
  TransactionContext
} from "@orix/core";
import { err, ok } from "@orix/core";
import {
  CustomerManagementApplicationService,
  InventoryManagementApplicationService,
  PurchaseManagementApplicationService,
  ProductManagementApplicationService,
  SaleManagementApplicationService,
  SupplierManagementApplicationService
} from "@orix/application";
import { createDatabaseConnection, runMigrations, type DatabaseConnection } from "@orix/database";
import { createOspoMigrationPreview, type OrixProductImportCandidate } from "@orix/migration";
import type {
  AppContextContract,
  AppIpcError,
  AppSettingsDto,
  BackupCreateContract,
  BackupRecordDto,
  BackupRestoreContract,
  BackupSelectDirectoryContract,
  BackupSelectFileContract,
  BackupStatusContract,
  BackupVerifyContract,
  AuthStatusContract,
  CatalogWritePayload,
  CustomerActivityContract,
  CustomerArchiveContract,
  CustomerGetContract,
  CustomerIpcError,
  CustomerListContract,
  CustomerPaymentRecordContract,
  CustomerRestoreContract,
  CustomerSaveContract,
  CustomerStatementContract,
  DashboardGetContract,
  InventoryAdjustContract,
  InventoryIpcError,
  InventoryListContract,
  InventoryMovementsContract,
  InventoryOpeningStockContract,
  InventoryOverviewContract,
  ProductArchiveContract,
  ProductCatalogArchiveContract,
  ProductCatalogGetContract,
  ProductCatalogRestoreContract,
  ProductCatalogSaveContract,
  ProductGetContract,
  ProductIpcError,
  ProductListContract,
  ProductRestoreContract,
  ProductSaveContract,
  PurchaseCancelContract,
  PurchaseGetContract,
  PurchaseListContract,
  PurchaseReceiveContract,
  PurchaseSaveDraftContract,
  SettingsGetContract,
  SettingsSaveContract,
  LegacyStockImportContract,
  LegacyStockImportPreviewContract,
  LegacyStockImportResultDto,
  LegacyStockImportSelectFilesContract,
  LoginContract,
  LockContract,
  LogoutContract,
  SetupStoreContract,
  UnlockContract,
  UserResetSecretContract,
  UserSaveContract,
  UsersListContract,
  AuthStatusDto,
  AuthUserDto,
  PermissionCode,
  ResetSecretPayload,
  RoleName,
  CashRegisterContract,
  SaleCancelContract,
  SaleCompleteContract,
  SaleGetContract,
  SaleHoldContract,
  SaleIpcError,
  SaleListContract,
  SaleReceiptContract,
  SaleSaveDraftContract,
  SalesDashboardContract,
  SetupStorePayload,
  SupplierActivityContract,
  SupplierArchiveContract,
  SupplierGetContract,
  SupplierIpcError,
  SupplierListContract,
  SupplierPaymentRecordContract,
  SupplierRestoreContract,
  SupplierSaveContract,
  SupplierStatementContract
} from "@orix/electron";
import { createRepositories, type CatalogItem, type RepositoryFactory } from "@orix/repositories";
import { err as ipcErr, ok as ipcOk, type Result } from "@orix/shared";
import type * as Electron from "electron";
import type { BrowserWindow as BrowserWindowType } from "electron";
import {
  buildBackupFileName,
  buildBackupNumber,
  calculateFileChecksum,
  verificationFailed,
  verificationOk
} from "./backup-utils.js";

type ElectronMainRuntime = Pick<typeof Electron, "app" | "BrowserWindow" | "dialog" | "ipcMain">;

const electronRuntime = (
  globalThis as typeof globalThis & {
    readonly __orixElectron?: ElectronMainRuntime;
  }
).__orixElectron;

if (electronRuntime === undefined) {
  throw new Error("Electron runtime was not initialized.");
}

const { app, BrowserWindow, dialog, ipcMain } = electronRuntime;

const isSmokeRun = process.argv.includes("--smoke");
const settingsEffectiveAt = "1970-01-01T00:00:00.000Z";

type AppState = {
  readonly connection: DatabaseConnection;
  readonly dbPath: string;
  readonly repositories: RepositoryFactory;
  readonly productService: ProductManagementApplicationService;
  readonly inventoryService: InventoryManagementApplicationService;
  readonly customerService: CustomerManagementApplicationService;
  readonly supplierService: SupplierManagementApplicationService;
  readonly purchaseService: PurchaseManagementApplicationService;
  readonly saleService: SaleManagementApplicationService;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  userId: string;
  locked: boolean;
  rememberedUsername: string | null;
};

type CountRow = {
  readonly count: number;
};

type MoneyRow = {
  readonly amount: number | null;
};

type AppSettingRow = {
  readonly valueJson: string;
};

type BackupRow = {
  readonly id: string;
  readonly backupNumber: string;
  readonly status: string;
  readonly fileName: string | null;
  readonly fileSizeBytes: number | null;
  readonly checksum: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly verifiedAt: string | null;
  readonly failureReason: string | null;
};

type UserRow = {
  readonly id: string;
  readonly displayName: string;
  readonly username: string;
  readonly status: string;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
};

type CredentialRecord = {
  readonly passwordHash: string;
  readonly passwordSalt: string;
  readonly pinHash: string;
  readonly pinSalt: string;
};

type StoreProfileSettings = {
  readonly ownerName: string;
  readonly businessName: string;
  readonly logoDataUrl: string | null;
  readonly timezone: string;
  readonly taxEnabled: boolean;
};

type RecentActivityRow = {
  readonly id: string;
  readonly name: string;
  readonly occurredAt: string;
};

const defaultSettings: AppSettingsDto = {
  theme: "system",
  storeDisplayName: "My Store",
  receiptHeader: "Orix Retail OS",
  receiptFooter: "Thank you for shopping with us.",
  backupLocation: ""
};

const allPermissions = [
  "dashboard.view",
  "pos.view",
  "inventory.view",
  "inventory.manage",
  "products.view",
  "products.manage",
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.delete",
  "customers.payments",
  "customers.export",
  "suppliers.view",
  "suppliers.create",
  "suppliers.edit",
  "suppliers.delete",
  "suppliers.payments",
  "suppliers.export",
  "purchases.view",
  "purchases.create",
  "purchases.edit",
  "purchases.receive",
  "purchases.cancel",
  "sales.view",
  "sales.create",
  "sales.complete",
  "sales.cancel",
  "sales.print",
  "expenses.view",
  "reports.view",
  "settings.view",
  "settings.manage",
  "users.view",
  "users.manage",
  "about.view"
] as const satisfies readonly PermissionCode[];

const rolePermissionMap = {
  Owner: allPermissions,
  Manager: allPermissions.filter((permission) => permission !== "settings.manage"),
  Cashier: [
    "dashboard.view",
    "pos.view",
    "products.view",
    "customers.view",
    "customers.payments",
    "suppliers.view",
    "sales.view",
    "sales.create",
    "sales.complete",
    "sales.cancel",
    "sales.print",
    "about.view"
  ],
  "Inventory Manager": [
    "dashboard.view",
    "inventory.view",
    "inventory.manage",
    "products.view",
    "products.manage",
    "customers.view",
    "suppliers.view",
    "suppliers.create",
    "suppliers.edit",
    "suppliers.payments",
    "purchases.view",
    "purchases.create",
    "purchases.edit",
    "purchases.receive",
    "purchases.cancel",
    "sales.view",
    "about.view"
  ],
  Accountant: [
    "dashboard.view",
    "customers.view",
    "customers.payments",
    "suppliers.view",
    "suppliers.payments",
    "expenses.view",
    "reports.view",
    "sales.view",
    "sales.print",
    "purchases.view",
    "about.view"
  ],
  Viewer: [
    "dashboard.view",
    "inventory.view",
    "products.view",
    "customers.view",
    "suppliers.view",
    "reports.view",
    "about.view"
  ]
} as const satisfies Record<RoleName, readonly PermissionCode[]>;

const roleNames = Object.keys(rolePermissionMap) as readonly RoleName[];

class SqliteTransactionRunner {
  public constructor(private readonly connection: DatabaseConnection) {}

  public async run<T>(
    options: { readonly name: string; readonly metadata?: Readonly<Record<string, unknown>> },
    scope: (transaction: TransactionContext) => Promise<CoreResult<T>>
  ): Promise<CoreResult<T>> {
    const transaction: TransactionContext = {
      id: randomUUID(),
      depth: 0,
      isolationLevel: "immediate",
      metadata: { name: options.name, ...(options.metadata ?? {}) }
    };

    try {
      this.connection.sqlite.prepare("BEGIN IMMEDIATE").run();
      const result = await scope(transaction);
      if (result.ok) {
        this.connection.sqlite.prepare("COMMIT").run();
      } else {
        this.connection.sqlite.prepare("ROLLBACK").run();
      }
      return result;
    } catch (cause) {
      this.connection.sqlite.prepare("ROLLBACK").run();
      return err({
        code: "APPLICATION_TRANSACTION_FAILED",
        message: "Transaction failed.",
        severity: "error",
        cause
      });
    }
  }
}

class PersistedEventPublisher implements EventPublisher {
  public constructor(private readonly connection: DatabaseConnection) {}

  public publish(event: ApplicationEvent): Promise<CoreResult<void>> {
    try {
      const sourceId = this.extractEntityId(event);
      this.connection.sqlite
        .prepare(
          `INSERT INTO business_events (
            id, store_id, branch_id, event_name, source_type, source_id,
            payload_summary_json, occurred_at, created_at, created_by_user_id
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          event.id,
          String(event.metadata.storeId),
          event.name,
          event.name,
          sourceId,
          JSON.stringify(event.payload),
          event.occurredAt,
          new Date().toISOString(),
          typeof event.metadata.actorId === "string" ? event.metadata.actorId : null
        );
      return Promise.resolve(ok(undefined));
    } catch (cause) {
      return Promise.resolve(
        err({
          code: "APPLICATION_EVENT_PUBLISH_FAILED",
          message: "Failed to persist business event.",
          severity: "error",
          cause
        })
      );
    }
  }

  private extractEntityId(event: ApplicationEvent): string {
    const payload = event.payload as Readonly<Record<string, unknown>>;
    return typeof payload.entityId === "string" ? payload.entityId : event.id;
  }
}

const createMainWindow = (): BrowserWindowType => {
  const window = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1100,
    minHeight: 680,
    show: !isSmokeRun,
    title: "Orix Retail OS",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(fileURLToPath(new URL("../../preload.cjs", import.meta.url)))
    }
  });

  if (isSmokeRun) {
    void window.loadURL(
      "data:text/html;charset=utf-8,<html><body style='margin:0;background:#f8fafc;'></body></html>"
    );
  } else {
    void window.loadFile(join(fileURLToPath(new URL("../renderer/index.html", import.meta.url))));
  }

  return window;
};

const initializeAppState = (): AppState => {
  const dbPath = join(app.getPath("userData"), "orix-retail-os.sqlite");
  const connection = createDatabaseConnection({ filePath: dbPath });
  runMigrations(connection, {
    migrationsFolder: resolveMigrationsFolder()
  });
  const bootstrap = ensureBootstrapData(connection);
  seedRolesAndPermissions(
    connection,
    bootstrap.storeId,
    bootstrap.userId,
    new Date().toISOString()
  );
  const repositories = createRepositories(connection);
  const productService = new ProductManagementApplicationService({
    repositories,
    transactionRunner: new SqliteTransactionRunner(connection),
    eventPublisher: new PersistedEventPublisher(connection)
  });
  const inventoryService = new InventoryManagementApplicationService({
    repositories,
    transactionRunner: new SqliteTransactionRunner(connection),
    eventPublisher: new PersistedEventPublisher(connection)
  });
  const customerService = new CustomerManagementApplicationService({
    repositories,
    transactionRunner: new SqliteTransactionRunner(connection),
    eventPublisher: new PersistedEventPublisher(connection)
  });
  const supplierService = new SupplierManagementApplicationService({
    repositories,
    transactionRunner: new SqliteTransactionRunner(connection),
    eventPublisher: new PersistedEventPublisher(connection)
  });
  const purchaseService = new PurchaseManagementApplicationService({
    repositories,
    transactionRunner: new SqliteTransactionRunner(connection),
    eventPublisher: new PersistedEventPublisher(connection)
  });
  const saleService = new SaleManagementApplicationService({
    repositories,
    transactionRunner: new SqliteTransactionRunner(connection),
    eventPublisher: new PersistedEventPublisher(connection)
  });

  return {
    connection,
    dbPath,
    repositories,
    productService,
    inventoryService,
    customerService,
    supplierService,
    purchaseService,
    saleService,
    ...bootstrap,
    locked: true,
    rememberedUsername: readRememberedUsername(connection, bootstrap.storeId)
  };
};

const resolveMigrationsFolder = (): string => {
  const candidates = [
    join(app.getAppPath(), "packages/database/src/migrations"),
    join(app.getAppPath(), "../../packages/database/src/migrations"),
    join(process.cwd(), "packages/database/src/migrations")
  ];
  const found = candidates.find((candidate) => existsSync(join(candidate, "meta/_journal.json")));
  if (found === undefined) {
    throw new Error("Database migrations folder was not found.");
  }
  return found;
};

const ensureBootstrapData = (
  connection: DatabaseConnection
): Pick<AppState, "storeId" | "branchId" | "businessDayId" | "userId"> => {
  const timestamp = new Date().toISOString();
  const storeId = ensureStore(connection, timestamp);
  const branchId = ensureBranch(connection, storeId, timestamp);
  const userId = ensureUser(connection, storeId, timestamp);
  const businessDayId = ensureBusinessDay(connection, storeId, branchId, userId, timestamp);
  ensureDefaultCatalog(connection, storeId, userId, timestamp);
  return { storeId, branchId, businessDayId, userId };
};

const ensureStore = (connection: DatabaseConnection, timestamp: string): string => {
  const existing = connection.sqlite.prepare("SELECT id FROM stores LIMIT 1").get() as
    { readonly id: string } | undefined;
  if (existing !== undefined) {
    return existing.id;
  }
  const id = randomUUID();
  connection.sqlite
    .prepare(
      "INSERT INTO stores (id, name, currency_code, status, created_at) VALUES (?, 'My Store', 'PKR', 'active', ?)"
    )
    .run(id, timestamp);
  return id;
};

const ensureBranch = (
  connection: DatabaseConnection,
  storeId: string,
  timestamp: string
): string => {
  const existing = connection.sqlite
    .prepare("SELECT id FROM branches WHERE store_id = ? LIMIT 1")
    .get(storeId) as { readonly id: string } | undefined;
  if (existing !== undefined) {
    return existing.id;
  }
  const id = randomUUID();
  connection.sqlite
    .prepare(
      "INSERT INTO branches (id, store_id, name, code, status, is_default, created_at) VALUES (?, ?, 'Main Branch', 'MAIN', 'active', 1, ?)"
    )
    .run(id, storeId, timestamp);
  return id;
};

const ensureUser = (connection: DatabaseConnection, storeId: string, timestamp: string): string => {
  const existing = connection.sqlite
    .prepare("SELECT id FROM users WHERE store_id = ? LIMIT 1")
    .get(storeId) as { readonly id: string } | undefined;
  if (existing !== undefined) {
    return existing.id;
  }
  const id = randomUUID();
  connection.sqlite
    .prepare(
      "INSERT INTO users (id, store_id, display_name, username, status, created_at) VALUES (?, ?, 'Owner', 'owner', 'active', ?)"
    )
    .run(id, storeId, timestamp);
  return id;
};

const ensureBusinessDay = (
  connection: DatabaseConnection,
  storeId: string,
  branchId: string,
  userId: string,
  timestamp: string
): string => {
  const businessDate = timestamp.slice(0, 10);
  const existing = connection.sqlite
    .prepare("SELECT id FROM business_days WHERE branch_id = ? AND business_date = ? LIMIT 1")
    .get(branchId, businessDate) as { readonly id: string } | undefined;
  if (existing !== undefined) {
    return existing.id;
  }
  const id = randomUUID();
  connection.sqlite
    .prepare(
      `INSERT INTO business_days (
        id, store_id, branch_id, business_date, status, opened_at, opened_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`
    )
    .run(id, storeId, branchId, businessDate, timestamp, userId, timestamp);
  return id;
};

const ensureDefaultCatalog = (
  connection: DatabaseConnection,
  storeId: string,
  userId: string,
  timestamp: string
): void => {
  const categoryCount = connection.sqlite
    .prepare("SELECT COUNT(*) AS count FROM categories WHERE store_id = ?")
    .get(storeId) as { readonly count: number };
  if (categoryCount.count === 0) {
    connection.sqlite
      .prepare(
        `INSERT INTO categories (
          id, store_id, name, code, status, created_at, updated_at, created_by_user_id, updated_by_user_id
        ) VALUES (?, ?, 'General', 'GENERAL', 'active', ?, ?, ?, ?)`
      )
      .run(randomUUID(), storeId, timestamp, timestamp, userId, userId);
  }

  const standardUnits = [
    ["Piece", "pc"],
    ["Pack", "pack"],
    ["Box", "box"],
    ["Bottle", "btl"],
    ["Kg", "kg"],
    ["Gram", "g"],
    ["Liter", "l"],
    ["ML", "ml"]
  ] as const;
  for (const [name, abbreviation] of standardUnits) {
    const exists = connection.sqlite
      .prepare("SELECT id FROM units WHERE store_id = ? AND name = ? LIMIT 1")
      .get(storeId, name);
    if (exists === undefined) {
      connection.sqlite
        .prepare(
          `INSERT INTO units (
            id, store_id, name, abbreviation, status, created_at, updated_at, created_by_user_id, updated_by_user_id
          ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
        )
        .run(randomUUID(), storeId, name, abbreviation, timestamp, timestamp, userId, userId);
    }
  }
};

const settingValue = (
  connection: DatabaseConnection,
  storeId: string,
  key: string
): string | undefined =>
  (
    connection.sqlite
      .prepare(
        "SELECT value_json AS valueJson FROM settings WHERE store_id = ? AND key = ? LIMIT 1"
      )
      .get(storeId, key) as AppSettingRow | undefined
  )?.valueJson;

const upsertSetting = (
  connection: DatabaseConnection,
  storeId: string,
  key: string,
  value: unknown,
  category: string,
  userId: string | null,
  sensitive = false
): void => {
  const timestamp = new Date().toISOString();
  const existing = connection.sqlite
    .prepare("SELECT id FROM settings WHERE store_id = ? AND key = ? LIMIT 1")
    .get(storeId, key) as { readonly id: string } | undefined;
  if (existing === undefined) {
    connection.sqlite
      .prepare(
        `INSERT INTO settings (
          id, store_id, key, value_json, value_type, category, is_sensitive, is_locked,
          effective_at, created_at, updated_at, created_by_user_id, updated_by_user_id
        ) VALUES (?, ?, ?, ?, 'json', ?, ?, 0, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        storeId,
        key,
        JSON.stringify(value),
        category,
        sensitive ? 1 : 0,
        settingsEffectiveAt,
        timestamp,
        timestamp,
        userId,
        userId
      );
    return;
  }
  connection.sqlite
    .prepare(
      "UPDATE settings SET value_json = ?, updated_at = ?, updated_by_user_id = ? WHERE id = ?"
    )
    .run(JSON.stringify(value), timestamp, userId, existing.id);
};

const setupCompleted = (connection: DatabaseConnection, storeId: string): boolean =>
  settingValue(connection, storeId, "auth.initialized") === "true";

const readRememberedUsername = (connection: DatabaseConnection, storeId: string): string | null => {
  const raw = settingValue(connection, storeId, "auth.rememberedUsername");
  if (raw === undefined) {
    return null;
  }
  const parsed = JSON.parse(raw) as unknown;
  return typeof parsed === "string" && parsed.length > 0 ? parsed : null;
};

const deriveHash = (secret: string, salt: string): string =>
  pbkdf2Sync(secret, salt, 120_000, 32, "sha256").toString("hex");

const createCredentialRecord = (password: string, pin: string): CredentialRecord => {
  const passwordSalt = randomBytes(16).toString("hex");
  const pinSalt = randomBytes(16).toString("hex");
  return {
    passwordHash: deriveHash(password, passwordSalt),
    passwordSalt,
    pinHash: deriveHash(pin, pinSalt),
    pinSalt
  };
};

const verifySecret = (secret: string, hash: string, salt: string): boolean => {
  const actual = Buffer.from(deriveHash(secret, salt), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const credentialForUser = (
  connection: DatabaseConnection,
  storeId: string,
  userId: string
): CredentialRecord | undefined => {
  const raw = settingValue(connection, storeId, `auth.credentials.${userId}`);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = JSON.parse(raw) as Partial<CredentialRecord>;
  return typeof parsed.passwordHash === "string" &&
    typeof parsed.passwordSalt === "string" &&
    typeof parsed.pinHash === "string" &&
    typeof parsed.pinSalt === "string"
    ? {
        passwordHash: parsed.passwordHash,
        passwordSalt: parsed.passwordSalt,
        pinHash: parsed.pinHash,
        pinSalt: parsed.pinSalt
      }
    : undefined;
};

const storeProfile = (connection: DatabaseConnection, storeId: string): StoreProfileSettings => {
  const raw = settingValue(connection, storeId, "store.profile");
  if (raw === undefined) {
    return {
      ownerName: "Owner",
      businessName: "My Store",
      logoDataUrl: null,
      timezone: "Asia/Karachi",
      taxEnabled: false
    };
  }
  const parsed = JSON.parse(raw) as Partial<StoreProfileSettings>;
  return {
    ownerName: typeof parsed.ownerName === "string" ? parsed.ownerName : "Owner",
    businessName: typeof parsed.businessName === "string" ? parsed.businessName : "My Store",
    logoDataUrl: typeof parsed.logoDataUrl === "string" ? parsed.logoDataUrl : null,
    timezone: typeof parsed.timezone === "string" ? parsed.timezone : "Asia/Karachi",
    taxEnabled: parsed.taxEnabled === true
  };
};

const authStatus = (state: AppState): AuthStatusDto => {
  const store = state.connection.sqlite
    .prepare("SELECT name FROM stores WHERE id = ?")
    .get(state.storeId) as { readonly name: string } | undefined;
  const profile = storeProfile(state.connection, state.storeId);
  const needsSetup = !setupCompleted(state.connection, state.storeId);
  return {
    needsSetup,
    authenticated: !needsSetup && !state.locked,
    locked: state.locked,
    rememberedUsername: state.rememberedUsername,
    storeName: store?.name ?? null,
    storeLogoDataUrl: profile.logoDataUrl
  };
};

const validateSetup = (payload: SetupStorePayload): string | null => {
  if (payload.storeName.trim().length < 2) return "Store name is required.";
  if (payload.ownerName.trim().length < 2) return "Owner name is required.";
  if (payload.branchName.trim().length < 2) return "Default branch name is required.";
  if (payload.adminFullName.trim().length < 2) return "Admin full name is required.";
  if (payload.username.trim().length < 3) return "Username must be at least 3 characters.";
  if (payload.password.length < 8) return "Password must be at least 8 characters.";
  if (payload.password !== payload.confirmPassword) return "Passwords do not match.";
  if (!/^\d{4}$/.test(payload.pin)) return "PIN must be exactly 4 digits.";
  return null;
};

const seedRolesAndPermissions = (
  connection: DatabaseConnection,
  storeId: string,
  actorUserId: string,
  timestamp: string
): void => {
  for (const permission of allPermissions) {
    const [module, action] = permission.split(".");
    const exists = connection.sqlite
      .prepare("SELECT id FROM permissions WHERE code = ? LIMIT 1")
      .get(permission);
    if (exists === undefined) {
      connection.sqlite
        .prepare(
          `INSERT INTO permissions (id, code, module, action, description, is_system_permission, created_at, updated_at, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          permission,
          module,
          action,
          permission,
          timestamp,
          timestamp,
          actorUserId
        );
    }
  }

  for (const roleName of roleNames) {
    const roleId = ensureRole(connection, storeId, roleName, actorUserId, timestamp);
    for (const permission of rolePermissionMap[roleName]) {
      const permissionRow = connection.sqlite
        .prepare("SELECT id FROM permissions WHERE code = ? LIMIT 1")
        .get(permission) as { readonly id: string };
      const exists = connection.sqlite
        .prepare(
          `SELECT id FROM role_permissions
            WHERE role_id = ? AND permission_id = ? AND revoked_at IS NULL LIMIT 1`
        )
        .get(roleId, permissionRow.id);
      if (exists === undefined) {
        connection.sqlite
          .prepare(
            `INSERT INTO role_permissions (id, role_id, permission_id, granted_at, granted_by_user_id)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(randomUUID(), roleId, permissionRow.id, timestamp, actorUserId);
      }
    }
  }
};

const ensureRole = (
  connection: DatabaseConnection,
  storeId: string,
  roleName: RoleName,
  actorUserId: string,
  timestamp: string
): string => {
  const existing = connection.sqlite
    .prepare("SELECT id FROM roles WHERE store_id = ? AND name = ? LIMIT 1")
    .get(storeId, roleName) as { readonly id: string } | undefined;
  if (existing !== undefined) {
    return existing.id;
  }
  const id = randomUUID();
  connection.sqlite
    .prepare(
      `INSERT INTO roles (id, store_id, name, description, is_system_role, status, created_at, updated_at, created_by_user_id, updated_by_user_id)
       VALUES (?, ?, ?, ?, 1, 'active', ?, ?, ?, ?)`
    )
    .run(id, storeId, roleName, `${roleName} role`, timestamp, timestamp, actorUserId, actorUserId);
  return id;
};

const assignRoles = (
  connection: DatabaseConnection,
  storeId: string,
  userId: string,
  roleNamesToAssign: readonly RoleName[],
  actorUserId: string,
  timestamp: string
): void => {
  connection.sqlite
    .prepare(
      "UPDATE user_roles SET revoked_at = ?, revoked_by_user_id = ? WHERE user_id = ? AND revoked_at IS NULL"
    )
    .run(timestamp, actorUserId, userId);
  for (const roleName of roleNamesToAssign) {
    const roleId = ensureRole(connection, storeId, roleName, actorUserId, timestamp);
    connection.sqlite
      .prepare(
        "INSERT INTO user_roles (id, user_id, role_id, assigned_at, assigned_by_user_id) VALUES (?, ?, ?, ?, ?)"
      )
      .run(randomUUID(), userId, roleId, timestamp, actorUserId);
  }
};

const permissionsForUser = (
  connection: DatabaseConnection,
  storeId: string,
  userId: string
): readonly PermissionCode[] => {
  const rows = connection.sqlite
    .prepare(
      `SELECT DISTINCT p.code
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
         JOIN roles r ON r.id = ur.role_id AND r.status = 'active'
         JOIN role_permissions rp ON rp.role_id = r.id AND rp.revoked_at IS NULL
         JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id = ? AND u.store_id = ? AND u.status = 'active'`
    )
    .all(userId, storeId) as { readonly code: string }[];
  const allowed = new Set<string>(allPermissions);
  return rows.map((row) => row.code).filter((code): code is PermissionCode => allowed.has(code));
};

const roleNamesForUser = (connection: DatabaseConnection, userId: string): readonly RoleName[] => {
  const rows = connection.sqlite
    .prepare(
      `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = ? AND ur.revoked_at IS NULL
        ORDER BY r.name`
    )
    .all(userId) as { readonly name: string }[];
  const valid = new Set<string>(roleNames);
  return rows.map((row) => row.name).filter((name): name is RoleName => valid.has(name));
};

const mapUser = (connection: DatabaseConnection, row: UserRow): AuthUserDto => ({
  id: row.id,
  fullName: row.displayName,
  username: row.username,
  status: row.status === "active" ? "active" : "disabled",
  roleNames: roleNamesForUser(connection, row.id),
  lastLoginAt: row.lastLoginAt,
  createdAt: row.createdAt
});

const findLoginUser = (
  connection: DatabaseConnection,
  storeId: string,
  username: string
): UserRow | undefined =>
  connection.sqlite
    .prepare(
      `SELECT id, display_name AS displayName, username, status, last_login_at AS lastLoginAt, created_at AS createdAt
         FROM users
        WHERE store_id = ? AND lower(username) = lower(?) AND archived_at IS NULL
        LIMIT 1`
    )
    .get(storeId, username.trim()) as UserRow | undefined;

const mapError = (error: CoreError): ProductIpcError => {
  const fields =
    Array.isArray(error.context?.fields) &&
    error.context.fields.every((field): field is string => typeof field === "string")
      ? error.context.fields
      : undefined;
  return fields === undefined
    ? { code: error.code, message: error.message }
    : { code: error.code, message: error.message, fields };
};

const toIpc = <T>(result: CoreResult<T>): Result<T, ProductIpcError> =>
  result.ok ? ipcOk(result.value) : ipcErr(mapError(result.error));

const inventoryError = (error: CoreError): InventoryIpcError => {
  const fields =
    Array.isArray(error.context?.fields) &&
    error.context.fields.every((field): field is string => typeof field === "string")
      ? error.context.fields
      : undefined;
  return fields === undefined
    ? { code: error.code, message: error.message }
    : { code: error.code, message: error.message, fields };
};

const toInventoryIpc = <T>(result: CoreResult<T>): Result<T, InventoryIpcError> =>
  result.ok ? ipcOk(result.value) : ipcErr(inventoryError(result.error));

const customerError = (error: CoreError): CustomerIpcError => {
  const fields =
    Array.isArray(error.context?.fields) &&
    error.context.fields.every((field): field is string => typeof field === "string")
      ? error.context.fields
      : undefined;
  return fields === undefined
    ? { code: error.code, message: error.message }
    : { code: error.code, message: error.message, fields };
};

const toCustomerIpc = <T>(result: CoreResult<T>): Result<T, CustomerIpcError> =>
  result.ok ? ipcOk(result.value) : ipcErr(customerError(result.error));

const toSupplierIpc = <T>(result: CoreResult<T>): Result<T, SupplierIpcError> =>
  result.ok ? ipcOk(result.value) : ipcErr(customerError(result.error));

const toSaleIpc = <T>(result: CoreResult<T>): Result<T, SaleIpcError> =>
  result.ok ? ipcOk(result.value) : ipcErr(customerError(result.error));

const appError = (message: string): AppIpcError => ({
  code: "APP_OPERATION_FAILED",
  message
});

const appOk = <T>(value: T): Result<T, AppIpcError> => ipcOk(value);

const appFail = <T>(message: string): Result<T, AppIpcError> => ipcErr(appError(message));

const migrationFail = <T>(message: string, code = "MIGRATION_OPERATION_FAILED") =>
  ipcErr({ code, message }) as Result<T, { readonly code: string; readonly message: string }>;

const moneyAmount = (connection: DatabaseConnection, sql: string, ...params: readonly string[]) =>
  (connection.sqlite.prepare(sql).get(...params) as MoneyRow | undefined)?.amount ?? 0;

const countAmount = (connection: DatabaseConnection, sql: string, ...params: readonly string[]) =>
  (connection.sqlite.prepare(sql).get(...params) as CountRow | undefined)?.count ?? 0;

const registerAuthHandlers = (state: AppState): void => {
  ipcMain.handle("orix:auth.status", (): AuthStatusContract["response"] =>
    appOk(authStatus(state))
  );

  ipcMain.handle(
    "orix:setup.store",
    (_event, request: SetupStoreContract["request"]): SetupStoreContract["response"] => {
      const payload = request.payload;
      const validationError = validateSetup(payload);
      if (validationError !== null) {
        return appFail(validationError);
      }
      try {
        const timestamp = new Date().toISOString();
        state.connection.sqlite.prepare("BEGIN IMMEDIATE").run();
        state.connection.sqlite
          .prepare(
            `UPDATE stores
                SET name = ?, trading_name = ?, phone = ?, email = ?, address = ?,
                    currency_code = ?, status = 'active', activated_at = ?, updated_at = ?
              WHERE id = ?`
          )
          .run(
            payload.storeName.trim(),
            payload.businessName.trim(),
            payload.phone.trim() || null,
            payload.email.trim() || null,
            payload.address.trim() || null,
            payload.currency.trim() || "PKR",
            timestamp,
            timestamp,
            state.storeId
          );
        state.connection.sqlite
          .prepare("UPDATE branches SET name = ?, code = 'MAIN', updated_at = ? WHERE id = ?")
          .run(payload.branchName.trim(), timestamp, state.branchId);
        state.connection.sqlite
          .prepare(
            `UPDATE users
                SET display_name = ?, username = ?, status = 'active', updated_at = ?
              WHERE id = ?`
          )
          .run(payload.adminFullName.trim(), payload.username.trim(), timestamp, state.userId);
        seedRolesAndPermissions(state.connection, state.storeId, state.userId, timestamp);
        assignRoles(
          state.connection,
          state.storeId,
          state.userId,
          ["Owner"],
          state.userId,
          timestamp
        );
        upsertSetting(
          state.connection,
          state.storeId,
          `auth.credentials.${state.userId}`,
          createCredentialRecord(payload.password, payload.pin),
          "auth",
          state.userId,
          true
        );
        upsertSetting(
          state.connection,
          state.storeId,
          "auth.initialized",
          true,
          "auth",
          state.userId
        );
        upsertSetting(
          state.connection,
          state.storeId,
          "store.profile",
          {
            ownerName: payload.ownerName.trim(),
            businessName: payload.businessName.trim(),
            logoDataUrl: payload.logoDataUrl,
            timezone: payload.timezone,
            taxEnabled: payload.taxEnabled
          } satisfies StoreProfileSettings,
          "store",
          state.userId
        );
        upsertSetting(
          state.connection,
          state.storeId,
          "application.shell",
          {
            ...defaultSettings,
            storeDisplayName: payload.storeName.trim()
          } satisfies AppSettingsDto,
          "application",
          state.userId
        );
        ensureDefaultCatalog(state.connection, state.storeId, state.userId, timestamp);
        state.connection.sqlite.prepare("COMMIT").run();
        state.locked = false;
        return appOk(authStatus(state));
      } catch {
        state.connection.sqlite.prepare("ROLLBACK").run();
        return appFail("Unable to complete store setup.");
      }
    }
  );

  ipcMain.handle(
    "orix:auth.login",
    (_event, request: LoginContract["request"]): LoginContract["response"] => {
      try {
        const payload = request.payload;
        const user = findLoginUser(state.connection, state.storeId, payload.username);
        if (user?.status !== "active") {
          return appFail("Invalid username or credentials.");
        }
        const credentials = credentialForUser(state.connection, state.storeId, user.id);
        if (credentials === undefined) {
          return appFail("This user does not have login credentials.");
        }
        const passwordOk =
          typeof payload.password === "string" &&
          payload.password.length > 0 &&
          verifySecret(payload.password, credentials.passwordHash, credentials.passwordSalt);
        const pinOk =
          typeof payload.pin === "string" &&
          payload.pin.length > 0 &&
          verifySecret(payload.pin, credentials.pinHash, credentials.pinSalt);
        if (!passwordOk && !pinOk) {
          return appFail("Invalid username or credentials.");
        }
        state.userId = user.id;
        state.locked = false;
        state.rememberedUsername = payload.rememberMe ? user.username : null;
        upsertSetting(
          state.connection,
          state.storeId,
          "auth.rememberedUsername",
          state.rememberedUsername ?? "",
          "auth",
          state.userId
        );
        state.connection.sqlite
          .prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?")
          .run(new Date().toISOString(), new Date().toISOString(), user.id);
        return appOk(authStatus(state));
      } catch {
        return appFail("Unable to sign in.");
      }
    }
  );

  ipcMain.handle("orix:auth.lock", (): LockContract["response"] => {
    state.locked = true;
    return appOk(authStatus(state));
  });

  ipcMain.handle(
    "orix:auth.unlock",
    (_event, request: UnlockContract["request"]): UnlockContract["response"] => {
      try {
        const credentials = credentialForUser(state.connection, state.storeId, state.userId);
        if (credentials === undefined) {
          return appFail("Current user does not have credentials.");
        }
        const payload = request.payload;
        const passwordOk =
          typeof payload.password === "string" &&
          payload.password.length > 0 &&
          verifySecret(payload.password, credentials.passwordHash, credentials.passwordSalt);
        const pinOk =
          typeof payload.pin === "string" &&
          payload.pin.length > 0 &&
          verifySecret(payload.pin, credentials.pinHash, credentials.pinSalt);
        if (!passwordOk && !pinOk) {
          return appFail("Unable to unlock with those credentials.");
        }
        state.locked = false;
        return appOk(authStatus(state));
      } catch {
        return appFail("Unable to unlock.");
      }
    }
  );

  ipcMain.handle("orix:auth.logout", (): LogoutContract["response"] => {
    state.locked = true;
    return appOk(authStatus(state));
  });
};

const registerUserHandlers = (state: AppState): void => {
  ipcMain.handle(
    "orix:users.list",
    (_event, request: UsersListContract["request"]): UsersListContract["response"] => {
      if (
        !permissionsForUser(state.connection, state.storeId, state.userId).includes("users.view")
      ) {
        return appFail("You do not have permission to view users.");
      }
      const search = `%${(request.payload.search ?? "").trim().toLowerCase()}%`;
      const status = request.payload.status ?? "all";
      const rows = state.connection.sqlite
        .prepare(
          `SELECT id, display_name AS displayName, username, status, last_login_at AS lastLoginAt, created_at AS createdAt
           FROM users
          WHERE store_id = ?
            AND archived_at IS NULL
            AND (? = 'all' OR status = ?)
            AND (lower(display_name) LIKE ? OR lower(username) LIKE ?)
          ORDER BY display_name`
        )
        .all(
          state.storeId,
          status,
          status === "disabled" ? "inactive" : status,
          search,
          search
        ) as UserRow[];
      return appOk({ users: rows.map((row) => mapUser(state.connection, row)), roles: roleNames });
    }
  );

  ipcMain.handle(
    "orix:users.save",
    (_event, request: UserSaveContract["request"]): UserSaveContract["response"] => {
      if (
        !permissionsForUser(state.connection, state.storeId, state.userId).includes("users.manage")
      ) {
        return appFail("You do not have permission to manage users.");
      }
      try {
        const payload = request.payload;
        const timestamp = new Date().toISOString();
        if (payload.fullName.trim().length < 2 || payload.username.trim().length < 3) {
          return appFail("Full name and username are required.");
        }
        if (payload.roleNames.length === 0) {
          return appFail("Select at least one role.");
        }
        const userId = payload.id ?? randomUUID();
        const status = payload.status === "active" ? "active" : "inactive";
        if (payload.id === undefined) {
          if (payload.password === undefined || payload.password.length < 8) {
            return appFail("Password must be at least 8 characters.");
          }
          if (payload.pin === undefined || !/^\d{4}$/.test(payload.pin)) {
            return appFail("PIN must be exactly 4 digits.");
          }
          state.connection.sqlite
            .prepare(
              `INSERT INTO users (id, store_id, display_name, username, status, created_at, updated_at, created_by_user_id, updated_by_user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              userId,
              state.storeId,
              payload.fullName.trim(),
              payload.username.trim(),
              status,
              timestamp,
              timestamp,
              state.userId,
              state.userId
            );
          upsertSetting(
            state.connection,
            state.storeId,
            `auth.credentials.${userId}`,
            createCredentialRecord(payload.password, payload.pin),
            "auth",
            state.userId,
            true
          );
        } else {
          state.connection.sqlite
            .prepare(
              "UPDATE users SET display_name = ?, username = ?, status = ?, updated_at = ?, updated_by_user_id = ? WHERE id = ? AND store_id = ?"
            )
            .run(
              payload.fullName.trim(),
              payload.username.trim(),
              status,
              timestamp,
              state.userId,
              userId,
              state.storeId
            );
        }
        seedRolesAndPermissions(state.connection, state.storeId, state.userId, timestamp);
        assignRoles(
          state.connection,
          state.storeId,
          userId,
          payload.roleNames,
          state.userId,
          timestamp
        );
        const row = state.connection.sqlite
          .prepare(
            `SELECT id, display_name AS displayName, username, status, last_login_at AS lastLoginAt, created_at AS createdAt
             FROM users WHERE id = ?`
          )
          .get(userId) as UserRow;
        return appOk({ user: mapUser(state.connection, row) });
      } catch {
        return appFail("Unable to save user. Username may already exist.");
      }
    }
  );

  ipcMain.handle(
    "orix:users.reset-secret",
    (_event, request: UserResetSecretContract["request"]): UserResetSecretContract["response"] => {
      if (
        !permissionsForUser(state.connection, state.storeId, state.userId).includes("users.manage")
      ) {
        return appFail("You do not have permission to reset credentials.");
      }
      const payload: ResetSecretPayload = request.payload;
      if (payload.password !== undefined && payload.password.length < 8) {
        return appFail("Password must be at least 8 characters.");
      }
      if (payload.pin !== undefined && !/^\d{4}$/.test(payload.pin)) {
        return appFail("PIN must be exactly 4 digits.");
      }
      const existing = credentialForUser(state.connection, state.storeId, payload.userId);
      const next = createCredentialRecord(
        payload.password ?? "temporary-password-unused",
        payload.pin ?? "0000"
      );
      upsertSetting(
        state.connection,
        state.storeId,
        `auth.credentials.${payload.userId}`,
        {
          passwordHash:
            payload.password === undefined && existing !== undefined
              ? existing.passwordHash
              : next.passwordHash,
          passwordSalt:
            payload.password === undefined && existing !== undefined
              ? existing.passwordSalt
              : next.passwordSalt,
          pinHash:
            payload.pin === undefined && existing !== undefined ? existing.pinHash : next.pinHash,
          pinSalt:
            payload.pin === undefined && existing !== undefined ? existing.pinSalt : next.pinSalt
        } satisfies CredentialRecord,
        "auth",
        state.userId,
        true
      );
      return appOk({ reset: true });
    }
  );
};

const readAppSettings = (state: AppState): AppSettingsDto => {
  const row = state.connection.sqlite
    .prepare(
      "SELECT value_json AS valueJson FROM settings WHERE store_id = ? AND key = 'application.shell' ORDER BY effective_at DESC LIMIT 1"
    )
    .get(state.storeId) as AppSettingRow | undefined;
  if (row === undefined) {
    return defaultSettings;
  }

  const parsed = JSON.parse(row.valueJson) as Partial<AppSettingsDto>;
  return {
    theme:
      parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
        ? parsed.theme
        : defaultSettings.theme,
    storeDisplayName:
      typeof parsed.storeDisplayName === "string"
        ? parsed.storeDisplayName
        : defaultSettings.storeDisplayName,
    receiptHeader:
      typeof parsed.receiptHeader === "string"
        ? parsed.receiptHeader
        : defaultSettings.receiptHeader,
    receiptFooter:
      typeof parsed.receiptFooter === "string"
        ? parsed.receiptFooter
        : defaultSettings.receiptFooter,
    backupLocation:
      typeof parsed.backupLocation === "string"
        ? parsed.backupLocation
        : defaultSettings.backupLocation
  };
};

const saveAppSettings = (state: AppState, settings: AppSettingsDto): AppSettingsDto => {
  const timestamp = new Date().toISOString();
  const existing = state.connection.sqlite
    .prepare(
      "SELECT id FROM settings WHERE store_id = ? AND key = 'application.shell' AND effective_at = ? LIMIT 1"
    )
    .get(state.storeId, settingsEffectiveAt) as { readonly id: string } | undefined;

  if (existing === undefined) {
    state.connection.sqlite
      .prepare(
        `INSERT INTO settings (
          id, store_id, key, value_json, value_type, category, is_sensitive, is_locked,
          effective_at, created_at, updated_at, created_by_user_id, updated_by_user_id
        ) VALUES (?, ?, 'application.shell', ?, 'json', 'application', 0, 0, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        state.storeId,
        JSON.stringify(settings),
        settingsEffectiveAt,
        timestamp,
        timestamp,
        state.userId,
        state.userId
      );
  } else {
    state.connection.sqlite
      .prepare(
        `UPDATE settings
            SET value_json = ?, updated_at = ?, updated_by_user_id = ?
          WHERE id = ?`
      )
      .run(JSON.stringify(settings), timestamp, state.userId, existing.id);
  }

  return settings;
};

const backupLocationFor = (state: AppState): string => {
  const configured = readAppSettings(state).backupLocation.trim();
  return configured.length > 0
    ? configured
    : join(app.getPath("documents"), "Orix Retail OS Backups");
};

const backupRecordFromRow = (row: BackupRow, backupLocation: string): BackupRecordDto => {
  const status =
    row.status === "started" || row.status === "completed" || row.status === "failed"
      ? row.status
      : "failed";
  return {
    id: row.id,
    backupNumber: row.backupNumber,
    status,
    fileName: row.fileName ?? "Unknown backup file",
    filePath: row.fileName === null ? null : join(backupLocation, row.fileName),
    fileSizeBytes: row.fileSizeBytes,
    checksum: row.checksum,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    verifiedAt: row.verifiedAt,
    failureReason: row.failureReason
  };
};

const recentBackupRows = (state: AppState): readonly BackupRecordDto[] => {
  const backupLocation = backupLocationFor(state);
  const rows = state.connection.sqlite
    .prepare(
      `SELECT id,
              backup_number AS backupNumber,
              status,
              file_name AS fileName,
              file_size_bytes AS fileSizeBytes,
              checksum,
              started_at AS startedAt,
              completed_at AS completedAt,
              verified_at AS verifiedAt,
              failure_reason AS failureReason
         FROM backups
        WHERE store_id = ?
        ORDER BY COALESCE(completed_at, started_at, created_at) DESC
        LIMIT 8`
    )
    .all(state.storeId) as BackupRow[];
  return rows.map((row) => backupRecordFromRow(row, backupLocation));
};

const publishBackupEvent = async (
  state: AppState,
  eventName:
    | "BackupStarted"
    | "BackupCompleted"
    | "BackupFailed"
    | "RestoreStarted"
    | "RestoreCompleted"
    | "RestoreFailed",
  sourceId: string,
  payload: Readonly<Record<string, unknown>>
): Promise<void> => {
  await new PersistedEventPublisher(state.connection).publish({
    id: randomUUID(),
    kind: "domain",
    name: eventName,
    version: 1,
    occurredAt: new Date().toISOString(),
    payload: {
      entityId: sourceId,
      ...payload
    },
    metadata: { storeId: state.storeId, actorId: state.userId }
  });
};

const verifyBackupFile = (filePath: string): BackupVerifyContract["response"] => {
  try {
    if (!existsSync(filePath)) {
      return appOk(verificationFailed("Backup file was not found."));
    }
    const readonlyConnection = createDatabaseConnection({
      filePath,
      mode: "readonly",
      enableWal: false
    });
    try {
      const integrity = readonlyConnection.sqlite.prepare("PRAGMA integrity_check").get() as
        { readonly integrity_check?: string } | undefined;
      if (integrity?.integrity_check !== "ok") {
        return appOk(verificationFailed("SQLite integrity check failed."));
      }
      const storeCount = countAmount(readonlyConnection, "SELECT COUNT(*) AS count FROM stores");
      if (storeCount < 1) {
        return appOk(verificationFailed("Backup does not contain store data."));
      }
      return appOk(verificationOk("Backup is valid and restorable."));
    } finally {
      readonlyConnection.close();
    }
  } catch {
    return appOk(verificationFailed("Backup could not be opened as an Orix database."));
  }
};

const createVerifiedBackup = async (state: AppState): Promise<BackupRecordDto> => {
  const startedAt = new Date();
  const backupNumber = buildBackupNumber(startedAt);
  const backupLocation = backupLocationFor(state);
  await mkdir(backupLocation, { recursive: true });
  const fileName = buildBackupFileName(startedAt);
  const filePath = join(backupLocation, fileName);
  const backupId = randomUUID();
  const timestamp = startedAt.toISOString();

  state.connection.sqlite
    .prepare(
      `INSERT INTO backups (
        id, store_id, backup_number, status, destination_type, file_name, app_version,
        started_at, created_at, created_by_user_id
      ) VALUES (?, ?, ?, 'started', 'local-file', ?, ?, ?, ?, ?)`
    )
    .run(
      backupId,
      state.storeId,
      backupNumber,
      fileName,
      app.getVersion(),
      timestamp,
      timestamp,
      state.userId
    );
  await publishBackupEvent(state, "BackupStarted", backupId, { backupNumber, fileName });

  try {
    state.connection.sqlite.pragma("wal_checkpoint(FULL)");
    await state.connection.sqlite.backup(filePath);
    const fileStats = await stat(filePath);
    const checksum = await calculateFileChecksum(filePath);
    const verification = verifyBackupFile(filePath);
    const verifiedAt =
      verification.ok && verification.value.valid ? verification.value.checkedAt : null;
    const completedAt = new Date().toISOString();
    state.connection.sqlite
      .prepare(
        `UPDATE backups
            SET status = 'completed',
                file_size_bytes = ?,
                checksum = ?,
                completed_at = ?,
                verified_at = ?
          WHERE id = ?`
      )
      .run(fileStats.size, checksum, completedAt, verifiedAt, backupId);
    await publishBackupEvent(state, "BackupCompleted", backupId, {
      backupNumber,
      fileName,
      fileSizeBytes: fileStats.size,
      checksum
    });
    return {
      id: backupId,
      backupNumber,
      status: "completed",
      fileName,
      filePath,
      fileSizeBytes: fileStats.size,
      checksum,
      startedAt: timestamp,
      completedAt,
      verifiedAt,
      failureReason: null
    };
  } catch (cause) {
    const failureReason = cause instanceof Error ? cause.message : "Backup failed.";
    state.connection.sqlite
      .prepare("UPDATE backups SET status = 'failed', failure_reason = ? WHERE id = ?")
      .run(failureReason, backupId);
    await publishBackupEvent(state, "BackupFailed", backupId, {
      backupNumber,
      fileName,
      failureReason
    });
    throw cause;
  }
};

const registerAppHandlers = (state: AppState): void => {
  ipcMain.handle("orix:app.context", (): AppContextContract["response"] => {
    try {
      if (state.locked || !setupCompleted(state.connection, state.storeId)) {
        return appFail("Sign in is required.");
      }
      const store = state.connection.sqlite
        .prepare("SELECT name, phone, email, address FROM stores WHERE id = ?")
        .get(state.storeId) as
        | {
            readonly name: string;
            readonly phone: string | null;
            readonly email: string | null;
            readonly address: string | null;
          }
        | undefined;
      const branch = state.connection.sqlite
        .prepare("SELECT name FROM branches WHERE id = ?")
        .get(state.branchId) as { readonly name: string } | undefined;
      const user = state.connection.sqlite
        .prepare("SELECT display_name AS name FROM users WHERE id = ?")
        .get(state.userId) as { readonly name: string } | undefined;
      const day = state.connection.sqlite
        .prepare("SELECT status, business_date AS businessDate FROM business_days WHERE id = ?")
        .get(state.businessDayId) as
        { readonly status: "open" | "closed"; readonly businessDate: string } | undefined;

      return appOk({
        storeName: store?.name ?? defaultSettings.storeDisplayName,
        storePhone: store?.phone ?? null,
        storeEmail: store?.email ?? null,
        storeAddress: store?.address ?? null,
        storeLogoDataUrl: storeProfile(state.connection, state.storeId).logoDataUrl,
        businessDayStatus: day?.status ?? "closed",
        currentUser: user?.name ?? "Owner",
        currentUserId: state.userId,
        currentBranch: branch?.name ?? "Main Branch",
        businessDate: day?.businessDate ?? new Date().toISOString().slice(0, 10),
        applicationVersion: app.getVersion(),
        databaseConnected: true,
        syncStatus: "offline",
        permissions: permissionsForUser(state.connection, state.storeId, state.userId)
      });
    } catch {
      return appFail("Unable to load application context.");
    }
  });

  ipcMain.handle("orix:dashboard.get", (): DashboardGetContract["response"] => {
    try {
      const todaySalesMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(total_minor), 0) AS amount FROM sales WHERE business_day_id = ? AND status = 'completed'",
        state.businessDayId
      );
      const todayPurchasesMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(total_minor), 0) AS amount FROM purchases WHERE business_day_id = ? AND status = 'received'",
        state.businessDayId
      );
      const cashInDrawerMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(paid_minor), 0) AS amount FROM sales WHERE business_day_id = ? AND status = 'completed'",
        state.businessDayId
      );
      const outstandingCustomersMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(debit_minor - credit_minor), 0) AS amount FROM ledger_entries WHERE account_ref_type = 'customer'"
      );
      const outstandingSuppliersMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(credit_minor - debit_minor), 0) AS amount FROM ledger_entries WHERE account_ref_type = 'supplier'"
      );
      const todayCollectionsMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(amount_minor), 0) AS amount FROM customer_payments WHERE business_day_id = ? AND status = 'recorded'",
        state.businessDayId
      );
      const supplierPaymentsTodayMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(amount_minor), 0) AS amount FROM supplier_payments WHERE business_day_id = ? AND status = 'recorded'",
        state.businessDayId
      );
      const monthStart = `${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`;
      const purchasesThisMonthMinor = moneyAmount(
        state.connection,
        "SELECT COALESCE(SUM(total_minor), 0) AS amount FROM purchases WHERE store_id = ? AND status = 'received' AND purchase_date >= ?",
        state.storeId,
        monthStart
      );
      const pendingSupplierPaymentsMinor = outstandingSuppliersMinor;
      const customersAddedTodayResult = state.connection.sqlite
        .prepare("SELECT business_date AS businessDate FROM business_days WHERE id = ?")
        .get(state.businessDayId) as { readonly businessDate: string } | undefined;
      const customersAddedToday = state.connection.sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM customers WHERE store_id = ? AND substr(created_at, 1, 10) = ?"
        )
        .get(
          state.storeId,
          customersAddedTodayResult?.businessDate ?? new Date().toISOString().slice(0, 10)
        ) as CountRow;
      const topDebtors = state.connection.sqlite
        .prepare(
          `SELECT c.id, c.name, c.phone, c.notes,
                  COALESCE(SUM(le.debit_minor - le.credit_minor), 0) AS balanceMinor
             FROM customers c
             LEFT JOIN ledger_entries le ON le.account_ref_type = 'customer' AND le.account_ref_id = c.id
            WHERE c.store_id = ? AND c.archived_at IS NULL
            GROUP BY c.id
            HAVING balanceMinor > 0
            ORDER BY balanceMinor DESC
            LIMIT 10`
        )
        .all(state.storeId) as {
        readonly id: string;
        readonly name: string;
        readonly phone: string | null;
        readonly notes: string | null;
        readonly balanceMinor: number;
      }[];
      const recentlyActiveCustomers = state.connection.sqlite
        .prepare(
          `SELECT c.id, c.name, c.phone, c.notes,
                  COALESCE(SUM(le.debit_minor - le.credit_minor), 0) AS balanceMinor
             FROM customers c
             LEFT JOIN ledger_entries le ON le.account_ref_type = 'customer' AND le.account_ref_id = c.id
             LEFT JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
            WHERE c.store_id = ? AND c.archived_at IS NULL
            GROUP BY c.id
            ORDER BY MAX(COALESCE(lt.posted_at, c.updated_at, c.created_at)) DESC
            LIMIT 10`
        )
        .all(state.storeId) as typeof topDebtors;
      const topSuppliers = state.connection.sqlite
        .prepare(
          `SELECT s.id, s.name, s.phone, s.notes,
                  COALESCE(SUM(p.total_minor), 0) AS balanceMinor
             FROM suppliers s
             LEFT JOIN purchases p ON p.supplier_id = s.id AND p.status = 'received'
            WHERE s.store_id = ? AND s.archived_at IS NULL
            GROUP BY s.id
            HAVING balanceMinor > 0
            ORDER BY balanceMinor DESC
            LIMIT 10`
        )
        .all(state.storeId) as typeof topDebtors;
      const lowStockCount = countAmount(
        state.connection,
        `SELECT COUNT(*) AS count
           FROM products p
           LEFT JOIN (
             SELECT product_id,
                    SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END) AS current_stock
               FROM inventory_transactions
              WHERE status = 'posted'
              GROUP BY product_id
           ) stock ON stock.product_id = p.id
          WHERE p.store_id = ?
            AND p.archived_at IS NULL
            AND p.is_stock_tracked = 1
            AND COALESCE(stock.current_stock, 0) <= COALESCE(p.reorder_level_quantity, 0)`,
        state.storeId
      );
      const recentActivity = state.connection.sqlite
        .prepare(
          `SELECT id, event_name AS name, occurred_at AS occurredAt
             FROM business_events
            WHERE store_id = ?
            ORDER BY occurred_at DESC
            LIMIT 8`
        )
        .all(state.storeId) as RecentActivityRow[];

      return appOk({
        todaySalesMinor,
        todayPurchasesMinor,
        cashInDrawerMinor,
        outstandingCustomersMinor,
        outstandingSuppliersMinor,
        lowStockCount,
        todayCollectionsMinor,
        customersAddedToday: customersAddedToday.count,
        supplierPaymentsTodayMinor,
        purchasesThisMonthMinor,
        pendingSupplierPaymentsMinor,
        topSellingProductName: null,
        recentActivity,
        topDebtors: topDebtors.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          city: null,
          balanceMinor: customer.balanceMinor
        })),
        recentlyActiveCustomers: recentlyActiveCustomers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          city: null,
          balanceMinor: customer.balanceMinor
        })),
        topSuppliers: topSuppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          city: null,
          balanceMinor: supplier.balanceMinor
        }))
      });
    } catch {
      return appFail("Unable to load dashboard metrics.");
    }
  });

  ipcMain.handle("orix:settings.get", (): SettingsGetContract["response"] => {
    try {
      return appOk(readAppSettings(state));
    } catch {
      return appFail("Unable to load settings.");
    }
  });

  ipcMain.handle(
    "orix:settings.save",
    (_event, request: SettingsSaveContract["request"]): SettingsSaveContract["response"] => {
      try {
        return appOk(saveAppSettings(state, request.payload));
      } catch {
        return appFail("Unable to save settings.");
      }
    }
  );

  ipcMain.handle("orix:backups.status", (): BackupStatusContract["response"] => {
    try {
      const recentBackups = recentBackupRows(state);
      return appOk({
        backupLocation: backupLocationFor(state),
        lastBackup: recentBackups[0] ?? null,
        recentBackups
      });
    } catch {
      return appFail("Unable to load backup status.");
    }
  });

  ipcMain.handle(
    "orix:backups.select-directory",
    async (): Promise<BackupSelectDirectoryContract["response"]> => {
      if (!can(state, "settings.manage")) {
        return appFail("You do not have permission to manage backups.");
      }
      const result = await dialog.showOpenDialog({
        title: "Choose backup folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (result.canceled || result.filePaths[0] === undefined) {
        return appOk({ directoryPath: null });
      }
      const settings = readAppSettings(state);
      saveAppSettings(state, { ...settings, backupLocation: result.filePaths[0] });
      return appOk({ directoryPath: result.filePaths[0] });
    }
  );

  ipcMain.handle("orix:backups.create", async (): Promise<BackupCreateContract["response"]> => {
    if (!can(state, "settings.manage")) {
      return appFail("You do not have permission to create backups.");
    }
    try {
      return appOk(await createVerifiedBackup(state));
    } catch {
      return appFail(
        "Backup could not be created. Check the selected backup folder and try again."
      );
    }
  });

  ipcMain.handle(
    "orix:backups.select-file",
    async (): Promise<BackupSelectFileContract["response"]> => {
      if (!can(state, "settings.manage")) {
        return appFail("You do not have permission to restore backups.");
      }
      const result = await dialog.showOpenDialog({
        title: "Choose Orix backup file",
        properties: ["openFile"],
        filters: [
          { name: "SQLite backups", extensions: ["sqlite", "db"] },
          { name: "All files", extensions: ["*"] }
        ]
      });
      return appOk({ filePath: result.canceled ? null : (result.filePaths[0] ?? null) });
    }
  );

  ipcMain.handle(
    "orix:backups.verify",
    (_event, request: BackupVerifyContract["request"]): BackupVerifyContract["response"] => {
      if (!can(state, "settings.manage")) {
        return appFail("You do not have permission to verify backups.");
      }
      return verifyBackupFile(request.payload.filePath);
    }
  );

  ipcMain.handle(
    "orix:backups.restore",
    async (
      _event,
      request: BackupRestoreContract["request"]
    ): Promise<BackupRestoreContract["response"]> => {
      if (!can(state, "settings.manage")) {
        return appFail("You do not have permission to restore backups.");
      }
      if (request.payload.confirmation !== "RESTORE") {
        return appFail("Restore confirmation is required.");
      }
      const verification = verifyBackupFile(request.payload.filePath);
      if (!verification.ok || !verification.value.valid) {
        return appFail(
          verification.ok ? verification.value.message : "Backup could not be verified."
        );
      }

      let connectionClosed = false;
      try {
        await publishBackupEvent(state, "RestoreStarted", state.storeId, {
          backupFile: basename(request.payload.filePath)
        });
        const restorePointDirectory = join(backupLocationFor(state), "restore-points");
        await mkdir(restorePointDirectory, { recursive: true });
        const safetyBackupPath = join(
          restorePointDirectory,
          `before-restore-${buildBackupFileName(new Date())}`
        );
        state.connection.sqlite.pragma("wal_checkpoint(FULL)");
        await state.connection.sqlite.backup(safetyBackupPath);
        await publishBackupEvent(state, "RestoreCompleted", state.storeId, {
          backupFile: basename(request.payload.filePath),
          safetyBackup: basename(safetyBackupPath)
        });
        state.connection.close();
        connectionClosed = true;
        await copyFile(request.payload.filePath, state.dbPath);
        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 750);
        return appOk({
          restored: true,
          restartScheduled: true,
          safetyBackupPath
        });
      } catch {
        if (!connectionClosed) {
          await publishBackupEvent(state, "RestoreFailed", state.storeId, {
            backupFile: basename(request.payload.filePath)
          });
        }
        return appFail("Restore failed. Your current database was left unchanged.");
      }
    }
  );
};

const registerProductHandlers = (state: AppState): void => {
  ipcMain.handle("orix:products.list", (_event, request: ProductListContract["request"]) =>
    toIpc(
      state.productService.listProducts({
        ...request.payload,
        storeId: state.storeId,
        page: Math.max(1, request.payload.page),
        pageSize: Math.max(1, request.payload.pageSize)
      })
    )
  );
  ipcMain.handle("orix:products.get", (_event, request: ProductGetContract["request"]) =>
    toIpc(state.productService.getProduct(request.payload.id))
  );
  ipcMain.handle("orix:products.save", async (_event, request: ProductSaveContract["request"]) =>
    toIpc(
      await (request.payload.id === undefined
        ? state.productService.createProduct({
            ...request.payload,
            storeId: state.storeId,
            branchId: state.branchId,
            businessDayId: state.businessDayId,
            userId: state.userId
          })
        : state.productService.updateProduct({
            ...request.payload,
            id: request.payload.id,
            storeId: state.storeId,
            branchId: state.branchId,
            businessDayId: state.businessDayId,
            userId: state.userId
          }))
    )
  );
  ipcMain.handle(
    "orix:products.archive",
    async (_event, request: ProductArchiveContract["request"]) =>
      toIpc(
        await state.productService
          .archiveProduct({
            id: request.payload.id,
            storeId: state.storeId,
            userId: state.userId,
            timestamp: new Date().toISOString()
          })
          .then((result) => (result.ok ? ok({ archived: true as const }) : result))
      )
  );
  ipcMain.handle(
    "orix:products.restore",
    async (_event, request: ProductRestoreContract["request"]) =>
      toIpc(
        await state.productService
          .restoreProduct({
            id: request.payload.id,
            storeId: state.storeId,
            userId: state.userId,
            timestamp: new Date().toISOString()
          })
          .then((result) => (result.ok ? ok({ restored: true as const }) : result))
      )
  );
  ipcMain.handle("orix:products.catalog", (_event, request: ProductCatalogGetContract["request"]) =>
    toIpc(state.productService.getCatalog(state.storeId, request.payload.includeArchived ?? true))
  );
  ipcMain.handle(
    "orix:products.catalog.save",
    async (_event, request: ProductCatalogSaveContract["request"]) => {
      const input = toCatalogWriteInput(request.payload, state);
      return toIpc(
        await (request.payload.id === undefined
          ? state.productService.createCatalogItem(input)
          : state.productService.updateCatalogItem({ ...input, id: request.payload.id }))
      );
    }
  );
  ipcMain.handle(
    "orix:products.catalog.archive",
    async (_event, request: ProductCatalogArchiveContract["request"]) =>
      toIpc(
        await state.productService
          .archiveCatalogItem(toCatalogArchiveInput(request.payload, state))
          .then((result) => (result.ok ? ok({ archived: true as const }) : result))
      )
  );
  ipcMain.handle(
    "orix:products.catalog.restore",
    async (_event, request: ProductCatalogRestoreContract["request"]) =>
      toIpc(
        await state.productService
          .restoreCatalogItem(toCatalogArchiveInput(request.payload, state))
          .then((result) => (result.ok ? ok({ restored: true as const }) : result))
      )
  );
};

const registerInventoryHandlers = (state: AppState): void => {
  ipcMain.handle("orix:inventory.overview", (): InventoryOverviewContract["response"] =>
    toInventoryIpc(state.inventoryService.overview(state.storeId))
  );
  ipcMain.handle("orix:inventory.list", (_event, request: InventoryListContract["request"]) =>
    toInventoryIpc(
      state.inventoryService.listInventory({
        ...request.payload,
        storeId: state.storeId,
        page: Math.max(1, request.payload.page),
        pageSize: Math.max(1, request.payload.pageSize)
      })
    )
  );
  ipcMain.handle(
    "orix:inventory.movements",
    (_event, request: InventoryMovementsContract["request"]) =>
      toInventoryIpc(
        state.inventoryService.listMovements({
          ...request.payload,
          storeId: state.storeId,
          page: Math.max(1, request.payload.page),
          pageSize: Math.max(1, request.payload.pageSize)
        })
      )
  );
  ipcMain.handle(
    "orix:inventory.adjust",
    async (_event, request: InventoryAdjustContract["request"]) =>
      toInventoryIpc(
        await state.inventoryService.adjustStock({
          ...request.payload,
          storeId: state.storeId,
          branchId: state.branchId,
          businessDayId: state.businessDayId,
          userId: state.userId
        })
      )
  );
  ipcMain.handle(
    "orix:inventory.opening-stock",
    async (_event, request: InventoryOpeningStockContract["request"]) =>
      toInventoryIpc(
        await state.inventoryService.recordOpeningStock({
          ...request.payload,
          storeId: state.storeId,
          branchId: state.branchId,
          businessDayId: state.businessDayId,
          userId: state.userId
        })
      )
  );
};

const registerMigrationHandlers = (state: AppState): void => {
  ipcMain.handle(
    "orix:migration.legacy-stock.select-files",
    async (): Promise<LegacyStockImportSelectFilesContract["response"]> => {
      if (!can(state, "settings.manage")) {
        return migrationFail("You do not have permission to run migrations.", "MIGRATION_DENIED");
      }
      const result = await dialog.showOpenDialog({
        title: "Select legacy stock export files",
        properties: ["openFile", "multiSelections"],
        filters: [
          { name: "Legacy exports", extensions: ["csv", "sql"] },
          { name: "All files", extensions: ["*"] }
        ]
      });
      if (result.canceled) {
        return ipcOk({ selectedFiles: [], itemsFile: null, sqlFile: null });
      }
      const itemsFile =
        result.filePaths.find((filePath) => filePath.toLowerCase().includes("items")) ??
        result.filePaths.find((filePath) => filePath.toLowerCase().endsWith(".csv")) ??
        null;
      const sqlFile =
        result.filePaths.find((filePath) => filePath.toLowerCase().endsWith(".sql")) ?? null;
      return ipcOk({ selectedFiles: result.filePaths, itemsFile, sqlFile });
    }
  );

  ipcMain.handle(
    "orix:migration.legacy-stock.preview",
    async (
      _event,
      request: LegacyStockImportPreviewContract["request"]
    ): Promise<LegacyStockImportPreviewContract["response"]> => {
      if (!can(state, "settings.manage")) {
        return migrationFail(
          "You do not have permission to preview migrations.",
          "MIGRATION_DENIED"
        );
      }
      try {
        const preview = await createOspoMigrationPreview({
          itemsFile: request.payload.itemsFile,
          ...(request.payload.sqlFile === undefined ? {} : { sqlFile: request.payload.sqlFile }),
          sampleSize: 12
        });
        return ipcOk({
          generatedAt: preview.generatedAt,
          source: preview.source,
          store: preview.store,
          totals: preview.totals,
          issues: preview.issues,
          sampleProducts: preview.sampleProducts
        });
      } catch {
        return migrationFail("Unable to read legacy export files.", "MIGRATION_PREVIEW_FAILED");
      }
    }
  );

  ipcMain.handle(
    "orix:migration.legacy-stock.import",
    async (
      _event,
      request: LegacyStockImportContract["request"]
    ): Promise<LegacyStockImportContract["response"]> => {
      if (!can(state, "settings.manage")) {
        return migrationFail("You do not have permission to import data.", "MIGRATION_DENIED");
      }
      try {
        const preview = await createOspoMigrationPreview({
          itemsFile: request.payload.itemsFile,
          sqlFile: request.payload.sqlFile
        });
        return ipcOk(await importLegacyProductsAndStock(state, preview, request.payload.mode));
      } catch {
        return migrationFail("Unable to import legacy products and inventory.", "MIGRATION_FAILED");
      }
    }
  );
};

const importLegacyProductsAndStock = async (
  state: AppState,
  preview: Awaited<ReturnType<typeof createOspoMigrationPreview>>,
  mode: "valid-only" | "strict"
): Promise<LegacyStockImportResultDto> => {
  const timestamp = new Date().toISOString();
  const blockingByItemId = blockingIssuesByItemId(preview.issues);
  const globalBlockingIssues = preview.issues.filter(
    (issue) => issue.severity === "error" && issue.itemId === undefined
  );
  if (mode === "strict" && preview.issues.some((issue) => issue.severity === "error")) {
    throw new Error("Legacy import preview has blocking errors.");
  }
  if (globalBlockingIssues.length > 0) {
    throw new Error("Legacy import preview is missing required data.");
  }

  const catalog = state.repositories.productManagement.getCatalog(state.storeId, true);
  if (!catalog.ok) {
    throw new Error(catalog.error.message);
  }
  const categoryByName = catalogMap(catalog.value.categories);
  const unitByName = catalogMap(catalog.value.units);
  const seenNames = new Set<string>();
  const seenBarcodes = new Set<string>();
  const skippedProducts: {
    sourceItemId: string;
    name: string;
    reason: string;
  }[] = [];
  let createdCategories = 0;
  let createdUnits = 0;
  let createdProducts = 0;
  let openingStockTransactions = 0;

  state.connection.sqlite.prepare("BEGIN IMMEDIATE").run();
  try {
    for (const product of preview.products) {
      const skipReason = migrationSkipReason(
        state,
        product,
        blockingByItemId,
        seenNames,
        seenBarcodes
      );
      if (skipReason !== null) {
        skippedProducts.push({
          sourceItemId: product.sourceItemId,
          name: product.name,
          reason: skipReason
        });
        continue;
      }

      const category = ensureCatalogItem(state, categoryByName, "category", product.categoryName);
      if (category.created) createdCategories += 1;
      const unit = ensureCatalogItem(state, unitByName, "unit", product.unitName);
      if (unit.created) createdUnits += 1;

      const productId = randomUUID();
      const created = state.repositories.productManagement.createProduct({
        id: productId,
        storeId: state.storeId,
        categoryId: category.item.id,
        brandId: null,
        unitId: unit.item.id,
        name: product.name,
        barcode: product.barcode,
        description: product.description,
        purchasePriceMinor: product.purchasePriceMinor,
        salePriceMinor: product.salePriceMinor,
        minimumStock: product.minimumStock,
        active: true,
        userId: state.userId,
        timestamp
      });
      if (!created.ok) {
        throw new Error(created.error.message);
      }

      const openingStock = state.repositories.productManagement.createOpeningStock(
        productId,
        {
          storeId: state.storeId,
          categoryId: category.item.id,
          brandId: null,
          unitId: unit.item.id,
          name: product.name,
          barcode: product.barcode,
          description: product.description,
          purchasePriceMinor: product.purchasePriceMinor,
          salePriceMinor: product.salePriceMinor,
          minimumStock: product.minimumStock,
          active: true,
          userId: state.userId,
          timestamp
        },
        product.openingStock,
        state.branchId,
        state.businessDayId
      );
      if (!openingStock.ok) {
        throw new Error(openingStock.error.message);
      }

      createdProducts += 1;
      if (product.openingStock > 0) openingStockTransactions += 1;
      seenNames.add(product.name.toLocaleLowerCase());
      if (product.barcode !== null) seenBarcodes.add(product.barcode);
    }
    state.connection.sqlite.prepare("COMMIT").run();
  } catch (cause) {
    state.connection.sqlite.prepare("ROLLBACK").run();
    throw cause;
  }

  await new PersistedEventPublisher(state.connection).publish({
    id: randomUUID(),
    kind: "domain",
    name: "LegacyStockImported",
    version: 1,
    occurredAt: timestamp,
    payload: {
      entityId: state.storeId,
      createdProducts,
      openingStockTransactions,
      skippedProducts: skippedProducts.length
    },
    metadata: { storeId: state.storeId, actorId: state.userId }
  });

  return {
    importedAt: timestamp,
    createdCategories,
    createdUnits,
    createdProducts,
    openingStockTransactions,
    skippedProducts
  };
};

const blockingIssuesByItemId = (
  issues: readonly { readonly severity: string; readonly itemId?: string }[]
): ReadonlyMap<string, string> => {
  const map = new Map<string, string>();
  for (const issue of issues) {
    if (issue.severity === "error" && issue.itemId !== undefined) {
      map.set(issue.itemId, issue.itemId);
    }
  }
  return map;
};

const catalogMap = (items: readonly CatalogItem[]): Map<string, CatalogItem> => {
  const map = new Map<string, CatalogItem>();
  for (const item of items) {
    map.set(item.name.toLocaleLowerCase(), item);
  }
  return map;
};

const ensureCatalogItem = (
  state: AppState,
  catalog: Map<string, CatalogItem>,
  kind: "category" | "unit",
  name: string
): { readonly item: CatalogItem; readonly created: boolean } => {
  const key = name.toLocaleLowerCase();
  const existing = catalog.get(key);
  if (existing !== undefined) {
    return { item: existing, created: false };
  }
  const payload =
    kind === "unit"
      ? {
          storeId: state.storeId,
          name,
          abbreviation: name,
          userId: state.userId,
          timestamp: new Date().toISOString()
        }
      : {
          storeId: state.storeId,
          name,
          userId: state.userId,
          timestamp: new Date().toISOString()
        };
  const created = state.repositories.productManagement.createCatalogItem(kind, payload);
  if (!created.ok) {
    throw new Error(created.error.message);
  }
  catalog.set(key, created.value);
  return { item: created.value, created: true };
};

const migrationSkipReason = (
  state: AppState,
  product: OrixProductImportCandidate,
  blockingByItemId: ReadonlyMap<string, string>,
  seenNames: ReadonlySet<string>,
  seenBarcodes: ReadonlySet<string>
): string | null => {
  if (product.archived) return "Source item is archived.";
  if (blockingByItemId.has(product.sourceItemId))
    return "Source item has blocking validation errors.";
  if (product.openingStock < 0) return "Source item has negative stock.";
  const normalizedName = product.name.toLocaleLowerCase();
  if (seenNames.has(normalizedName)) return "Duplicate product name in source import.";
  if (product.barcode !== null && seenBarcodes.has(product.barcode)) {
    return "Duplicate barcode in source import.";
  }
  const existingName = state.repositories.productManagement.productNameExists(
    state.storeId,
    product.name
  );
  if (!existingName.ok) throw new Error(existingName.error.message);
  if (existingName.value) return "Product name already exists in Orix.";
  if (product.barcode !== null) {
    const existingBarcode = state.repositories.productManagement.barcodeExists(
      state.storeId,
      product.barcode
    );
    if (!existingBarcode.ok) throw new Error(existingBarcode.error.message);
    if (existingBarcode.value) return "Barcode already exists in Orix.";
  }
  return null;
};

const can = (state: AppState, permission: PermissionCode): boolean =>
  permissionsForUser(state.connection, state.storeId, state.userId).includes(permission);

const permissionDenied = <T>(
  message = "You do not have permission for this action."
): Result<T, CustomerIpcError> => ipcErr({ code: "CUSTOMER_PERMISSION_DENIED", message });

const supplierPermissionDenied = <T>(
  message = "You do not have permission for this action."
): Result<T, SupplierIpcError> => ipcErr({ code: "SUPPLIER_PERMISSION_DENIED", message });

const registerCustomerHandlers = (state: AppState): void => {
  ipcMain.handle("orix:customers.list", (_event, request: CustomerListContract["request"]) => {
    if (!can(state, "customers.view")) return permissionDenied();
    return toCustomerIpc(
      state.customerService.listCustomers({
        ...request.payload,
        storeId: state.storeId,
        page: Math.max(1, request.payload.page),
        pageSize: Math.max(1, request.payload.pageSize)
      })
    );
  });

  ipcMain.handle("orix:customers.get", (_event, request: CustomerGetContract["request"]) => {
    if (!can(state, "customers.view")) return permissionDenied();
    return toCustomerIpc(state.customerService.getCustomer(request.payload.id));
  });

  ipcMain.handle(
    "orix:customers.save",
    async (_event, request: CustomerSaveContract["request"]) => {
      const isUpdate = request.payload.id !== undefined;
      if (!can(state, isUpdate ? "customers.edit" : "customers.create")) return permissionDenied();
      const input = {
        ...request.payload,
        storeId: state.storeId,
        branchId: state.branchId,
        businessDayId: state.businessDayId,
        userId: state.userId
      };
      return toCustomerIpc(
        await (request.payload.id === undefined
          ? state.customerService.createCustomer(input)
          : state.customerService.updateCustomer({ ...input, id: request.payload.id }))
      );
    }
  );

  ipcMain.handle(
    "orix:customers.archive",
    async (_event, request: CustomerArchiveContract["request"]) => {
      if (!can(state, "customers.delete")) return permissionDenied();
      return toCustomerIpc(
        await state.customerService
          .archiveCustomer({
            id: request.payload.id,
            storeId: state.storeId,
            branchId: state.branchId,
            businessDayId: state.businessDayId,
            userId: state.userId
          })
          .then((result) => (result.ok ? ok({ archived: true as const }) : result))
      );
    }
  );

  ipcMain.handle(
    "orix:customers.restore",
    async (_event, request: CustomerRestoreContract["request"]) => {
      if (!can(state, "customers.delete")) return permissionDenied();
      return toCustomerIpc(
        await state.customerService
          .restoreCustomer({
            id: request.payload.id,
            storeId: state.storeId,
            branchId: state.branchId,
            businessDayId: state.businessDayId,
            userId: state.userId
          })
          .then((result) => (result.ok ? ok({ restored: true as const }) : result))
      );
    }
  );

  ipcMain.handle(
    "orix:customers.statement",
    (_event, request: CustomerStatementContract["request"]) => {
      if (!can(state, "customers.view")) return permissionDenied();
      const user = state.connection.sqlite
        .prepare("SELECT display_name AS name FROM users WHERE id = ?")
        .get(state.userId) as { readonly name: string } | undefined;
      return toCustomerIpc(
        state.customerService.statement(
          { ...request.payload, storeId: state.storeId },
          user?.name ?? "Owner"
        )
      );
    }
  );

  ipcMain.handle(
    "orix:customers.payment.record",
    async (_event, request: CustomerPaymentRecordContract["request"]) => {
      if (!can(state, "customers.payments")) return permissionDenied();
      return toCustomerIpc(
        await state.customerService.recordPayment({
          ...request.payload,
          storeId: state.storeId,
          branchId: state.branchId,
          businessDayId: state.businessDayId,
          userId: state.userId
        })
      );
    }
  );

  ipcMain.handle(
    "orix:customers.activity",
    (_event, request: CustomerActivityContract["request"]) => {
      if (!can(state, "customers.view")) return permissionDenied();
      const result = state.customerService.activity(request.payload.customerId);
      return toCustomerIpc(result.ok ? ok({ items: result.value }) : result);
    }
  );
};

const registerSupplierHandlers = (state: AppState): void => {
  ipcMain.handle("orix:suppliers.list", (_event, request: SupplierListContract["request"]) => {
    if (!can(state, "suppliers.view")) return supplierPermissionDenied();
    return toSupplierIpc(
      state.supplierService.listSuppliers({
        ...request.payload,
        storeId: state.storeId,
        page: Math.max(1, request.payload.page),
        pageSize: Math.max(1, request.payload.pageSize)
      })
    );
  });

  ipcMain.handle("orix:suppliers.get", (_event, request: SupplierGetContract["request"]) => {
    if (!can(state, "suppliers.view")) return supplierPermissionDenied();
    return toSupplierIpc(state.supplierService.getSupplier(request.payload.id));
  });

  ipcMain.handle(
    "orix:suppliers.save",
    async (_event, request: SupplierSaveContract["request"]) => {
      const isUpdate = request.payload.id !== undefined;
      if (!can(state, isUpdate ? "suppliers.edit" : "suppliers.create")) {
        return supplierPermissionDenied();
      }
      const input = {
        ...request.payload,
        storeId: state.storeId,
        branchId: state.branchId,
        businessDayId: state.businessDayId,
        userId: state.userId
      };
      return toSupplierIpc(
        await (request.payload.id === undefined
          ? state.supplierService.createSupplier(input)
          : state.supplierService.updateSupplier({ ...input, id: request.payload.id }))
      );
    }
  );

  ipcMain.handle(
    "orix:suppliers.archive",
    async (_event, request: SupplierArchiveContract["request"]) => {
      if (!can(state, "suppliers.delete")) return supplierPermissionDenied();
      return toSupplierIpc(
        await state.supplierService
          .archiveSupplier({
            id: request.payload.id,
            storeId: state.storeId,
            branchId: state.branchId,
            businessDayId: state.businessDayId,
            userId: state.userId
          })
          .then((result) => (result.ok ? ok({ archived: true as const }) : result))
      );
    }
  );

  ipcMain.handle(
    "orix:suppliers.restore",
    async (_event, request: SupplierRestoreContract["request"]) => {
      if (!can(state, "suppliers.delete")) return supplierPermissionDenied();
      return toSupplierIpc(
        await state.supplierService
          .restoreSupplier({
            id: request.payload.id,
            storeId: state.storeId,
            branchId: state.branchId,
            businessDayId: state.businessDayId,
            userId: state.userId
          })
          .then((result) => (result.ok ? ok({ restored: true as const }) : result))
      );
    }
  );

  ipcMain.handle(
    "orix:suppliers.statement",
    (_event, request: SupplierStatementContract["request"]) => {
      if (!can(state, "suppliers.view")) return supplierPermissionDenied();
      const user = state.connection.sqlite
        .prepare("SELECT display_name AS name FROM users WHERE id = ?")
        .get(state.userId) as { readonly name: string } | undefined;
      return toSupplierIpc(
        state.supplierService.statement(
          { ...request.payload, storeId: state.storeId },
          user?.name ?? "Owner"
        )
      );
    }
  );

  ipcMain.handle(
    "orix:suppliers.payment.record",
    async (_event, request: SupplierPaymentRecordContract["request"]) => {
      if (!can(state, "suppliers.payments")) return supplierPermissionDenied();
      return toSupplierIpc(
        await state.supplierService.recordPayment({
          ...request.payload,
          storeId: state.storeId,
          branchId: state.branchId,
          businessDayId: state.businessDayId,
          userId: state.userId
        })
      );
    }
  );

  ipcMain.handle(
    "orix:suppliers.activity",
    (_event, request: SupplierActivityContract["request"]) => {
      if (!can(state, "suppliers.view")) return supplierPermissionDenied();
      return toSupplierIpc(state.supplierService.activity(request.payload.supplierId));
    }
  );
};

const registerPurchaseHandlers = (state: AppState): void => {
  ipcMain.handle("orix:purchases.list", (_event, request: PurchaseListContract["request"]) => {
    if (!can(state, "purchases.view")) return supplierPermissionDenied();
    return toSupplierIpc(
      state.purchaseService.listPurchases({
        ...request.payload,
        storeId: state.storeId,
        page: Math.max(1, request.payload.page),
        pageSize: Math.max(1, request.payload.pageSize)
      })
    );
  });

  ipcMain.handle("orix:purchases.get", (_event, request: PurchaseGetContract["request"]) => {
    if (!can(state, "purchases.view")) return supplierPermissionDenied();
    return toSupplierIpc(state.purchaseService.getPurchase(request.payload.id));
  });

  ipcMain.handle(
    "orix:purchases.save-draft",
    async (_event, request: PurchaseSaveDraftContract["request"]) => {
      const isUpdate = request.payload.id !== undefined;
      if (!can(state, isUpdate ? "purchases.edit" : "purchases.create")) {
        return supplierPermissionDenied();
      }
      return toSupplierIpc(
        await state.purchaseService.saveDraft({
          ...request.payload,
          storeId: state.storeId,
          branchId: state.branchId,
          businessDayId: state.businessDayId,
          userId: state.userId
        })
      );
    }
  );

  ipcMain.handle(
    "orix:purchases.receive",
    async (_event, request: PurchaseReceiveContract["request"]) => {
      if (!can(state, "purchases.receive")) return supplierPermissionDenied();
      return toSupplierIpc(
        await state.purchaseService.receivePurchase({
          id: request.payload.id,
          storeId: state.storeId,
          branchId: state.branchId,
          businessDayId: state.businessDayId,
          userId: state.userId
        })
      );
    }
  );

  ipcMain.handle(
    "orix:purchases.cancel",
    async (_event, request: PurchaseCancelContract["request"]) => {
      if (!can(state, "purchases.cancel")) return supplierPermissionDenied();
      return toSupplierIpc(
        await state.purchaseService
          .cancelDraft({
            id: request.payload.id,
            reason: request.payload.reason,
            storeId: state.storeId,
            branchId: state.branchId,
            businessDayId: state.businessDayId,
            userId: state.userId
          })
          .then((result) => (result.ok ? ok({ cancelled: true as const }) : result))
      );
    }
  );
};

const salePermissionDenied = <T>(
  message = "You do not have permission for this action."
): Result<T, SaleIpcError> => ipcErr({ code: "SALE_PERMISSION_DENIED", message });

const saleInput = (payload: SaleSaveDraftContract["request"]["payload"], state: AppState) => ({
  ...payload,
  storeId: state.storeId,
  branchId: state.branchId,
  businessDayId: state.businessDayId,
  userId: state.userId
});

const registerSaleHandlers = (state: AppState): void => {
  ipcMain.handle("orix:sales.list", (_event, request: SaleListContract["request"]) => {
    if (!can(state, "sales.view")) return salePermissionDenied();
    return toSaleIpc(
      state.saleService.listSales({
        ...request.payload,
        storeId: state.storeId,
        page: Math.max(1, request.payload.page),
        pageSize: Math.max(1, request.payload.pageSize)
      })
    );
  });

  ipcMain.handle("orix:sales.get", (_event, request: SaleGetContract["request"]) => {
    if (!can(state, "sales.view")) return salePermissionDenied();
    return toSaleIpc(state.saleService.getSale(request.payload.id));
  });

  ipcMain.handle(
    "orix:sales.save-draft",
    async (_event, request: SaleSaveDraftContract["request"]) => {
      if (!can(state, "sales.create")) return salePermissionDenied();
      return toSaleIpc(await state.saleService.saveDraft(saleInput(request.payload, state)));
    }
  );

  ipcMain.handle("orix:sales.hold", async (_event, request: SaleHoldContract["request"]) => {
    if (!can(state, "sales.create")) return salePermissionDenied();
    return toSaleIpc(await state.saleService.holdSale(saleInput(request.payload, state)));
  });

  ipcMain.handle(
    "orix:sales.complete",
    async (_event, request: SaleCompleteContract["request"]) => {
      if (!can(state, "sales.complete")) return salePermissionDenied();
      return toSaleIpc(await state.saleService.completeSale(saleInput(request.payload, state)));
    }
  );

  ipcMain.handle("orix:sales.cancel", async (_event, request: SaleCancelContract["request"]) => {
    if (!can(state, "sales.cancel")) return salePermissionDenied();
    return toSaleIpc(
      await state.saleService
        .cancelDraft({
          id: request.payload.id,
          reason: request.payload.reason,
          storeId: state.storeId,
          branchId: state.branchId,
          businessDayId: state.businessDayId,
          userId: state.userId
        })
        .then((result) => (result.ok ? ok({ cancelled: true as const }) : result))
    );
  });

  ipcMain.handle("orix:sales.receipt", (_event, request: SaleReceiptContract["request"]) => {
    if (!can(state, "sales.print")) return salePermissionDenied();
    return toSaleIpc(state.saleService.receipt(request.payload.saleId));
  });

  ipcMain.handle("orix:cash-register.summary", (): CashRegisterContract["response"] => {
    if (!can(state, "pos.view")) return salePermissionDenied();
    return toSaleIpc(state.saleService.cashRegisterSummary(state.businessDayId));
  });

  ipcMain.handle("orix:sales.dashboard", (): SalesDashboardContract["response"] => {
    if (!can(state, "dashboard.view")) return salePermissionDenied();
    return toSaleIpc(state.saleService.dashboardSummary(state.storeId, state.businessDayId));
  });
};

const toCatalogWriteInput = (payload: CatalogWritePayload, state: AppState) => ({
  ...payload,
  storeId: state.storeId,
  userId: state.userId,
  timestamp: new Date().toISOString()
});

const toCatalogArchiveInput = (
  payload: ProductCatalogArchiveContract["request"]["payload"],
  state: AppState
) => ({
  ...payload,
  name: "",
  storeId: state.storeId,
  userId: state.userId,
  timestamp: new Date().toISOString()
});

let appState: AppState | undefined;

void app.whenReady().then(() => {
  appState = initializeAppState();
  registerAuthHandlers(appState);
  registerAppHandlers(appState);
  registerUserHandlers(appState);
  registerCustomerHandlers(appState);
  registerSupplierHandlers(appState);
  registerPurchaseHandlers(appState);
  registerSaleHandlers(appState);
  registerInventoryHandlers(appState);
  registerMigrationHandlers(appState);
  registerProductHandlers(appState);
  createMainWindow();

  if (isSmokeRun) {
    setTimeout(() => {
      app.quit();
    }, 500);
  }
});

app.on("window-all-closed", () => {
  appState?.connection.close();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
