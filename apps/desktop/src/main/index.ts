import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
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
  InventoryManagementApplicationService,
  ProductManagementApplicationService
} from "@orix/application";
import { createDatabaseConnection, runMigrations, type DatabaseConnection } from "@orix/database";
import type {
  AppContextContract,
  AppIpcError,
  AppSettingsDto,
  AuthStatusContract,
  CatalogWritePayload,
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
  SettingsGetContract,
  SettingsSaveContract,
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
  SetupStorePayload
} from "@orix/electron";
import { createRepositories } from "@orix/repositories";
import { err as ipcErr, ok as ipcOk, type Result } from "@orix/shared";
import type * as Electron from "electron";
import type { BrowserWindow as BrowserWindowType } from "electron";

type ElectronMainRuntime = Pick<typeof Electron, "app" | "BrowserWindow" | "ipcMain">;

const electronRuntime = (
  globalThis as typeof globalThis & {
    readonly __orixElectron?: ElectronMainRuntime;
  }
).__orixElectron;

if (electronRuntime === undefined) {
  throw new Error("Electron runtime was not initialized.");
}

const { app, BrowserWindow, ipcMain } = electronRuntime;

const isSmokeRun = process.argv.includes("--smoke");
const settingsEffectiveAt = "1970-01-01T00:00:00.000Z";

type AppState = {
  readonly connection: DatabaseConnection;
  readonly productService: ProductManagementApplicationService;
  readonly inventoryService: InventoryManagementApplicationService;
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
  "suppliers.view",
  "purchases.view",
  "sales.view",
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
    "sales.view",
    "about.view"
  ],
  "Inventory Manager": [
    "dashboard.view",
    "inventory.view",
    "inventory.manage",
    "products.view",
    "products.manage",
    "suppliers.view",
    "purchases.view",
    "about.view"
  ],
  Accountant: [
    "dashboard.view",
    "expenses.view",
    "reports.view",
    "sales.view",
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

  return {
    connection,
    productService,
    inventoryService,
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

const appError = (message: string): AppIpcError => ({
  code: "APP_OPERATION_FAILED",
  message
});

const appOk = <T>(value: T): Result<T, AppIpcError> => ipcOk(value);

const appFail = <T>(message: string): Result<T, AppIpcError> => ipcErr(appError(message));

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

const registerAppHandlers = (state: AppState): void => {
  ipcMain.handle("orix:app.context", (): AppContextContract["response"] => {
    try {
      if (state.locked || !setupCompleted(state.connection, state.storeId)) {
        return appFail("Sign in is required.");
      }
      const store = state.connection.sqlite
        .prepare("SELECT name FROM stores WHERE id = ?")
        .get(state.storeId) as { readonly name: string } | undefined;
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
        topSellingProductName: null,
        recentActivity
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
  registerInventoryHandlers(appState);
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
