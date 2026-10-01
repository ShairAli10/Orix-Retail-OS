"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/preload/index.ts
var index_exports = {};
module.exports = __toCommonJS(index_exports);
var import_electron = require("electron");
var requestId = () => {
  const cryptoApi = globalThis.crypto;
  return cryptoApi?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36)}`;
};
var request = (channel, payload) => import_electron.ipcRenderer.invoke(channel, {
  requestId: requestId(),
  payload
});
var productApi = {
  list: (payload) => request("orix:products.list", payload),
  get: (id) => request("orix:products.get", { id }),
  save: (payload) => request("orix:products.save", payload),
  archive: (id) => request("orix:products.archive", { id }),
  restore: (id) => request("orix:products.restore", { id }),
  catalog: (includeArchived = true) => request("orix:products.catalog", { includeArchived }),
  saveCatalog: (payload) => request("orix:products.catalog.save", payload),
  archiveCatalog: (id, kind) => request("orix:products.catalog.archive", {
    id,
    kind
  }),
  restoreCatalog: (id, kind) => request("orix:products.catalog.restore", {
    id,
    kind
  })
};
var appApi = {
  context: () => request("orix:app.context", {})
};
var authApi = {
  status: () => request("orix:auth.status", {}),
  setupStore: (payload) => request("orix:setup.store", payload),
  login: (payload) => request("orix:auth.login", payload),
  lock: () => request("orix:auth.lock", {}),
  unlock: (payload) => request("orix:auth.unlock", payload),
  logout: () => request("orix:auth.logout", {})
};
var usersApi = {
  list: (payload) => request("orix:users.list", payload),
  save: (payload) => request("orix:users.save", payload),
  resetSecret: (payload) => request("orix:users.reset-secret", payload)
};
var customersApi = {
  list: (payload) => request("orix:customers.list", payload),
  get: (id) => request("orix:customers.get", { id }),
  save: (payload) => request("orix:customers.save", payload),
  archive: (id) => request("orix:customers.archive", { id }),
  restore: (id) => request("orix:customers.restore", { id }),
  statement: (payload) => request("orix:customers.statement", payload),
  recordPayment: (payload) => request("orix:customers.payment.record", payload),
  activity: (customerId) => request("orix:customers.activity", { customerId })
};
var suppliersApi = {
  list: (payload) => request("orix:suppliers.list", payload),
  get: (id) => request("orix:suppliers.get", { id }),
  save: (payload) => request("orix:suppliers.save", payload),
  archive: (id) => request("orix:suppliers.archive", { id }),
  restore: (id) => request("orix:suppliers.restore", { id }),
  statement: (payload) => request("orix:suppliers.statement", payload),
  recordPayment: (payload) => request("orix:suppliers.payment.record", payload),
  activity: (supplierId) => request("orix:suppliers.activity", { supplierId })
};
var purchasesApi = {
  list: (payload) => request("orix:purchases.list", payload),
  get: (id) => request("orix:purchases.get", { id }),
  saveDraft: (payload) => request("orix:purchases.save-draft", payload),
  receive: (id) => request("orix:purchases.receive", { id }),
  cancel: (id, reason) => request("orix:purchases.cancel", { id, reason }),
  returnPurchase: (payload) => request("orix:purchases.return", payload)
};
var salesApi = {
  list: (payload) => request("orix:sales.list", payload),
  get: (id) => request("orix:sales.get", { id }),
  saveDraft: (payload) => request("orix:sales.save-draft", payload),
  hold: (payload) => request("orix:sales.hold", payload),
  complete: (payload) => request("orix:sales.complete", payload),
  cancel: (id, reason) => request("orix:sales.cancel", { id, reason }),
  returnSale: (payload) => request("orix:sales.return", payload),
  receipt: (saleId) => request("orix:sales.receipt", { saleId }),
  dashboard: () => request("orix:sales.dashboard", {})
};
var cashRegisterApi = {
  summary: () => request("orix:cash-register.summary", {})
};
var dashboardApi = {
  get: () => request("orix:dashboard.get", {})
};
var reportsApi = {
  summary: (payload) => request("orix:reports.summary", payload)
};
var diagnosticsApi = {
  status: () => request("orix:diagnostics.status", {}),
  notice: () => request("orix:diagnostics.notice", {}),
  export: () => request("orix:diagnostics.export", {}),
  report: (payload) => request("orix:diagnostics.report", payload)
};
var settingsApi = {
  get: () => request("orix:settings.get", {}),
  save: (payload) => request("orix:settings.save", payload)
};
var backupsApi = {
  status: () => request("orix:backups.status", {}),
  create: () => request("orix:backups.create", {}),
  selectDirectory: () => request("orix:backups.select-directory", {}),
  selectFile: () => request("orix:backups.select-file", {}),
  verify: (filePath) => request("orix:backups.verify", { filePath }),
  restore: (payload) => request("orix:backups.restore", payload)
};
var migrationApi = {
  resetStoreData: (payload) => request("orix:store.reset-data", payload),
  lastImport: () => request(
    "orix:migration.legacy-stock.last-result",
    {}
  ),
  selectLegacyStockFiles: () => request(
    "orix:migration.legacy-stock.select-files",
    {}
  ),
  previewLegacyStock: (payload) => request(
    "orix:migration.legacy-stock.preview",
    payload
  ),
  importLegacyStock: (payload) => request("orix:migration.legacy-stock.import", payload)
};
var inventoryApi = {
  overview: () => request("orix:inventory.overview", {}),
  list: (payload) => request("orix:inventory.list", payload),
  movements: (payload) => request("orix:inventory.movements", payload),
  adjust: (payload) => request("orix:inventory.adjust", payload),
  openingStock: (payload) => request("orix:inventory.opening-stock", payload),
  stockTakes: () => request("orix:inventory.stock-takes", {}),
  getStockTake: (id) => request("orix:inventory.stock-take.get", { id }),
  startStockTake: (payload) => request(
    "orix:inventory.stock-take.start",
    payload
  ),
  completeStockTake: (payload) => request(
    "orix:inventory.stock-take.complete",
    payload
  )
};
var counterApi = {
  reopen: (payload) => request("orix:counter.reopen", payload),
  summary: () => request("orix:counter.summary", {}),
  open: (payload) => request("orix:counter.open", payload),
  close: (payload) => request("orix:counter.close", payload),
  expense: (payload) => request("orix:counter.expense", payload)
};
import_electron.contextBridge.exposeInMainWorld("orix", {
  counter: counterApi,
  app: appApi,
  auth: authApi,
  backups: backupsApi,
  cashRegister: cashRegisterApi,
  customers: customersApi,
  dashboard: dashboardApi,
  inventory: inventoryApi,
  migration: migrationApi,
  reports: reportsApi,
  settings: settingsApi,
  diagnostics: diagnosticsApi,
  products: productApi,
  purchases: purchasesApi,
  sales: salesApi,
  suppliers: suppliersApi,
  users: usersApi
});
