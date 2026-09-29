import type { PermissionCode } from "@orix/electron";

// Every channel must have an explicit policy; new channels fail closed.
export const channelPermissions: Readonly<Record<string, PermissionCode | "session" | "public">> = {
  "diagnostics.status": "settings.manage",
  "diagnostics.export": "settings.manage",
  "diagnostics.notice": "public",
  "diagnostics.report": "public",
  "counter.summary": "expenses.view",
  "counter.open": "pos.view",
  "counter.close": "pos.view",
  "counter.expense": "expenses.manage",
  "auth.status": "public",
  "auth.login": "public",
  "auth.unlock": "public",
  "setup.store": "public",
  "auth.lock": "session",
  "auth.logout": "session",
  "app.context": "session",
  "settings.get": "public",
  "settings.save": "settings.manage",
  "dashboard.get": "dashboard.view",
  "users.list": "users.view",
  "users.save": "users.manage",
  "users.reset-secret": "users.manage",
  "products.list": "products.view",
  "products.get": "products.view",
  "products.catalog": "products.view",
  "products.save": "products.manage",
  "products.archive": "products.manage",
  "products.restore": "products.manage",
  "products.catalog.save": "products.manage",
  "products.catalog.archive": "products.manage",
  "products.catalog.restore": "products.manage",
  "inventory.overview": "inventory.view",
  "inventory.list": "inventory.view",
  "inventory.movements": "inventory.view",
  "inventory.adjust": "inventory.manage",
  "inventory.opening-stock": "inventory.manage",
  "inventory.stock-takes": "inventory.view",
  "inventory.stock-take.get": "inventory.view",
  "inventory.stock-take.start": "inventory.manage",
  "inventory.stock-take.complete": "inventory.manage",
  "customers.list": "customers.view",
  "customers.get": "customers.view",
  "customers.activity": "customers.view",
  "customers.statement": "customers.view",
  "customers.save": "session",
  "customers.archive": "customers.delete",
  "customers.restore": "customers.delete",
  "customers.payment.record": "customers.payments",
  "suppliers.list": "suppliers.view",
  "suppliers.get": "suppliers.view",
  "suppliers.activity": "suppliers.view",
  "suppliers.statement": "suppliers.view",
  "suppliers.save": "session",
  "suppliers.archive": "suppliers.delete",
  "suppliers.restore": "suppliers.delete",
  "suppliers.payment.record": "suppliers.payments",
  "purchases.list": "purchases.view",
  "purchases.get": "purchases.view",
  "purchases.save-draft": "session",
  "purchases.receive": "purchases.receive",
  "purchases.cancel": "purchases.cancel",
  "purchases.return": "purchases.return",
  "sales.list": "sales.view",
  "sales.get": "sales.view",
  "sales.save-draft": "sales.create",
  "sales.hold": "sales.create",
  "sales.complete": "sales.complete",
  "sales.cancel": "sales.cancel",
  "sales.return": "sales.return",
  "sales.receipt": "sales.print",
  "sales.dashboard": "dashboard.view",
  "cash-register.summary": "pos.view",
  "reports.summary": "reports.view",
  "backups.status": "settings.manage",
  "backups.create": "settings.manage",
  "backups.select-directory": "settings.manage",
  "backups.select-file": "settings.manage",
  "backups.verify": "settings.manage",
  "backups.restore": "settings.manage",
  "migration.legacy-stock.import": "settings.manage",
  "migration.legacy-stock.preview": "settings.manage",
  "migration.legacy-stock.select-files": "settings.manage"
};

export class SerialOperations {
  private tail: Promise<unknown> = Promise.resolve();
  public run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation, operation);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

export const validIpcRequest = (
  request: unknown
): request is { requestId: string; payload: Record<string, unknown> } => {
  if (request === null || typeof request !== "object") return false;
  const value = request as Record<string, unknown>;
  if (
    typeof value.requestId !== "string" ||
    value.requestId.length > 128 ||
    value.payload === null ||
    typeof value.payload !== "object" ||
    Array.isArray(value.payload)
  )
    return false;
  const valid = (item: unknown, depth = 0): boolean => {
    if (depth > 12) return false;
    if (typeof item === "number")
      return Number.isFinite(item) && Math.abs(item) <= Number.MAX_SAFE_INTEGER;
    if (typeof item === "string") return item.length <= 2_000_000;
    if (Array.isArray(item))
      return item.length <= 10000 && item.every((child) => valid(child, depth + 1));
    if (item !== null && typeof item === "object")
      return Object.entries(item).every(
        ([key, child]) =>
          (!key.endsWith("Minor") || (typeof child === "number" && Number.isSafeInteger(child))) &&
          valid(child, depth + 1)
      );
    return item === null || item === undefined || typeof item === "boolean";
  };
  return valid(value.payload);
};
