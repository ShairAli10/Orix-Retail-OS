const { contextBridge, ipcRenderer } = require("electron");

const requestId = () => {
  const cryptoApi = globalThis.crypto;
  return cryptoApi && typeof cryptoApi.randomUUID === "function"
    ? cryptoApi.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36)}`;
};

const request = (channel, payload) =>
  ipcRenderer.invoke(channel, {
    requestId: requestId(),
    payload
  });

const products = {
  list: (payload) => request("orix:products.list", payload),
  get: (id) => request("orix:products.get", { id }),
  save: (payload) => request("orix:products.save", payload),
  archive: (id) => request("orix:products.archive", { id }),
  restore: (id) => request("orix:products.restore", { id }),
  catalog: (includeArchived = true) => request("orix:products.catalog", { includeArchived }),
  saveCatalog: (payload) => request("orix:products.catalog.save", payload),
  archiveCatalog: (id, kind) => request("orix:products.catalog.archive", { id, kind }),
  restoreCatalog: (id, kind) => request("orix:products.catalog.restore", { id, kind })
};

const auth = {
  status: () => request("orix:auth.status", {}),
  setupStore: (payload) => request("orix:setup.store", payload),
  login: (payload) => request("orix:auth.login", payload),
  lock: () => request("orix:auth.lock", {}),
  unlock: (payload) => request("orix:auth.unlock", payload),
  logout: () => request("orix:auth.logout", {})
};

const users = {
  list: (payload) => request("orix:users.list", payload),
  save: (payload) => request("orix:users.save", payload),
  resetSecret: (payload) => request("orix:users.reset-secret", payload)
};

const customers = {
  list: (payload) => request("orix:customers.list", payload),
  get: (id) => request("orix:customers.get", { id }),
  save: (payload) => request("orix:customers.save", payload),
  archive: (id) => request("orix:customers.archive", { id }),
  restore: (id) => request("orix:customers.restore", { id }),
  statement: (payload) => request("orix:customers.statement", payload),
  recordPayment: (payload) => request("orix:customers.payment.record", payload),
  activity: (customerId) => request("orix:customers.activity", { customerId })
};

const suppliers = {
  list: (payload) => request("orix:suppliers.list", payload),
  get: (id) => request("orix:suppliers.get", { id }),
  save: (payload) => request("orix:suppliers.save", payload),
  archive: (id) => request("orix:suppliers.archive", { id }),
  restore: (id) => request("orix:suppliers.restore", { id }),
  statement: (payload) => request("orix:suppliers.statement", payload),
  recordPayment: (payload) => request("orix:suppliers.payment.record", payload),
  activity: (supplierId) => request("orix:suppliers.activity", { supplierId })
};

const purchases = {
  list: (payload) => request("orix:purchases.list", payload),
  get: (id) => request("orix:purchases.get", { id }),
  saveDraft: (payload) => request("orix:purchases.save-draft", payload),
  receive: (id) => request("orix:purchases.receive", { id }),
  cancel: (id, reason) => request("orix:purchases.cancel", { id, reason })
};

const sales = {
  list: (payload) => request("orix:sales.list", payload),
  get: (id) => request("orix:sales.get", { id }),
  saveDraft: (payload) => request("orix:sales.save-draft", payload),
  hold: (payload) => request("orix:sales.hold", payload),
  complete: (payload) => request("orix:sales.complete", payload),
  cancel: (id, reason) => request("orix:sales.cancel", { id, reason }),
  receipt: (saleId) => request("orix:sales.receipt", { saleId }),
  dashboard: () => request("orix:sales.dashboard", {})
};

const cashRegister = {
  summary: () => request("orix:cash-register.summary", {})
};

const dashboard = {
  get: () => request("orix:dashboard.get", {})
};

const settings = {
  get: () => request("orix:settings.get", {}),
  save: (payload) => request("orix:settings.save", payload)
};

const inventory = {
  overview: () => request("orix:inventory.overview", {}),
  list: (payload) => request("orix:inventory.list", payload),
  movements: (payload) => request("orix:inventory.movements", payload),
  adjust: (payload) => request("orix:inventory.adjust", payload),
  openingStock: (payload) => request("orix:inventory.opening-stock", payload)
};

const migration = {
  selectOspoFiles: () => request("orix:migration.ospos.select-files", {}),
  previewOspo: (payload) => request("orix:migration.ospos.preview", payload),
  importOspo: (payload) => request("orix:migration.ospos.import", payload)
};

contextBridge.exposeInMainWorld("orix", {
  app: {
    context: () => request("orix:app.context", {})
  },
  auth,
  cashRegister,
  customers,
  dashboard,
  inventory,
  migration,
  settings,
  products,
  purchases,
  sales,
  suppliers,
  users
});
