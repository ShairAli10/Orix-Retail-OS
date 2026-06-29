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

contextBridge.exposeInMainWorld("orix", {
  app: {
    context: () => request("orix:app.context", {})
  },
  auth,
  dashboard,
  inventory,
  settings,
  products,
  users
});
