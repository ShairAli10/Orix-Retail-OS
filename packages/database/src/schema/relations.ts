import { relations } from "drizzle-orm";
import { auditLogs } from "./audit-logs.js";
import { backups } from "./backups.js";
import { branches } from "./branches.js";
import { brands } from "./brands.js";
import { businessDays } from "./business-days.js";
import { businessEvents } from "./business-events.js";
import { cashAccounts } from "./cash-accounts.js";
import { cashSessions } from "./cash-sessions.js";
import { categories } from "./categories.js";
import { customerPayments } from "./customer-payments.js";
import { customers } from "./customers.js";
import { expenseCategories } from "./expense-categories.js";
import { expenses } from "./expenses.js";
import { inventoryTransactions } from "./inventory-transactions.js";
import { ledgerAccounts } from "./ledger-accounts.js";
import { ledgerEntries } from "./ledger-entries.js";
import { ledgerTransactions } from "./ledger-transactions.js";
import { paymentMethods } from "./payment-methods.js";
import { permissions } from "./permissions.js";
import { products } from "./products.js";
import { purchaseItems } from "./purchase-items.js";
import { purchases } from "./purchases.js";
import { rolePermissions } from "./role-permissions.js";
import { roles } from "./roles.js";
import { saleItems } from "./sale-items.js";
import { sales } from "./sales.js";
import { settings } from "./settings.js";
import { stores } from "./stores.js";
import { supplierPayments } from "./supplier-payments.js";
import { suppliers } from "./suppliers.js";
import { units } from "./units.js";
import { userRoles } from "./user-roles.js";
import { users } from "./users.js";

export const storesRelations = relations(stores, ({ many }) => ({
  branches: many(branches),
  users: many(users),
  roles: many(roles),
  products: many(products),
  customers: many(customers),
  suppliers: many(suppliers),
  settings: many(settings),
  backups: many(backups)
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  store: one(stores, { fields: [branches.storeId], references: [stores.id] }),
  businessDays: many(businessDays),
  cashAccounts: many(cashAccounts),
  sales: many(sales),
  purchases: many(purchases)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, { fields: [users.storeId], references: [stores.id] }),
  userRoles: many(userRoles),
  auditLogs: many(auditLogs)
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  store: one(stores, { fields: [roles.storeId], references: [stores.id] }),
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions)
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions)
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] })
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id]
  })
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  store: one(stores, { fields: [categories.storeId], references: [stores.id] }),
  products: many(products)
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  store: one(stores, { fields: [brands.storeId], references: [stores.id] }),
  products: many(products)
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  store: one(stores, { fields: [units.storeId], references: [stores.id] }),
  products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  unit: one(units, { fields: [products.unitId], references: [units.id] }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
  inventoryTransactions: many(inventoryTransactions)
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  store: one(stores, { fields: [customers.storeId], references: [stores.id] }),
  sales: many(sales),
  customerPayments: many(customerPayments)
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  store: one(stores, { fields: [suppliers.storeId], references: [stores.id] }),
  purchases: many(purchases),
  supplierPayments: many(supplierPayments)
}));

export const businessDaysRelations = relations(businessDays, ({ one, many }) => ({
  store: one(stores, { fields: [businessDays.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [businessDays.branchId], references: [branches.id] }),
  sales: many(sales),
  purchases: many(purchases),
  cashSessions: many(cashSessions)
}));

export const cashAccountsRelations = relations(cashAccounts, ({ one, many }) => ({
  store: one(stores, { fields: [cashAccounts.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [cashAccounts.branchId], references: [branches.id] }),
  cashSessions: many(cashSessions),
  customerPayments: many(customerPayments),
  supplierPayments: many(supplierPayments),
  expenses: many(expenses)
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  store: one(stores, { fields: [paymentMethods.storeId], references: [stores.id] }),
  customerPayments: many(customerPayments),
  supplierPayments: many(supplierPayments)
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  store: one(stores, { fields: [expenseCategories.storeId], references: [stores.id] }),
  expenses: many(expenses)
}));

export const cashSessionsRelations = relations(cashSessions, ({ one }) => ({
  cashAccount: one(cashAccounts, {
    fields: [cashSessions.cashAccountId],
    references: [cashAccounts.id]
  }),
  businessDay: one(businessDays, {
    fields: [cashSessions.businessDayId],
    references: [businessDays.id]
  })
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  store: one(stores, { fields: [sales.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [sales.branchId], references: [branches.id] }),
  businessDay: one(businessDays, { fields: [sales.businessDayId], references: [businessDays.id] }),
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  items: many(saleItems)
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
  unit: one(units, { fields: [saleItems.unitId], references: [units.id] })
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  store: one(stores, { fields: [purchases.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [purchases.branchId], references: [branches.id] }),
  businessDay: one(businessDays, {
    fields: [purchases.businessDayId],
    references: [businessDays.id]
  }),
  supplier: one(suppliers, { fields: [purchases.supplierId], references: [suppliers.id] }),
  items: many(purchaseItems)
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, { fields: [purchaseItems.purchaseId], references: [purchases.id] }),
  product: one(products, { fields: [purchaseItems.productId], references: [products.id] }),
  unit: one(units, { fields: [purchaseItems.unitId], references: [units.id] })
}));

export const customerPaymentsRelations = relations(customerPayments, ({ one }) => ({
  customer: one(customers, {
    fields: [customerPayments.customerId],
    references: [customers.id]
  }),
  cashAccount: one(cashAccounts, {
    fields: [customerPayments.cashAccountId],
    references: [cashAccounts.id]
  }),
  paymentMethod: one(paymentMethods, {
    fields: [customerPayments.paymentMethodId],
    references: [paymentMethods.id]
  })
}));

export const supplierPaymentsRelations = relations(supplierPayments, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierPayments.supplierId],
    references: [suppliers.id]
  }),
  cashAccount: one(cashAccounts, {
    fields: [supplierPayments.cashAccountId],
    references: [cashAccounts.id]
  }),
  paymentMethod: one(paymentMethods, {
    fields: [supplierPayments.paymentMethodId],
    references: [paymentMethods.id]
  })
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  expenseCategory: one(expenseCategories, {
    fields: [expenses.expenseCategoryId],
    references: [expenseCategories.id]
  }),
  cashAccount: one(cashAccounts, {
    fields: [expenses.cashAccountId],
    references: [cashAccounts.id]
  })
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  store: one(stores, { fields: [inventoryTransactions.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [inventoryTransactions.branchId], references: [branches.id] }),
  businessDay: one(businessDays, {
    fields: [inventoryTransactions.businessDayId],
    references: [businessDays.id]
  }),
  product: one(products, {
    fields: [inventoryTransactions.productId],
    references: [products.id]
  })
}));

export const ledgerTransactionsRelations = relations(ledgerTransactions, ({ one, many }) => ({
  store: one(stores, { fields: [ledgerTransactions.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [ledgerTransactions.branchId], references: [branches.id] }),
  businessDay: one(businessDays, {
    fields: [ledgerTransactions.businessDayId],
    references: [businessDays.id]
  }),
  entries: many(ledgerEntries)
}));

export const ledgerAccountsRelations = relations(ledgerAccounts, ({ one, many }) => ({
  store: one(stores, { fields: [ledgerAccounts.storeId], references: [stores.id] }),
  entries: many(ledgerEntries)
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  ledgerTransaction: one(ledgerTransactions, {
    fields: [ledgerEntries.ledgerTransactionId],
    references: [ledgerTransactions.id]
  }),
  ledgerAccount: one(ledgerAccounts, {
    fields: [ledgerEntries.ledgerAccountId],
    references: [ledgerAccounts.id]
  })
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  store: one(stores, { fields: [settings.storeId], references: [stores.id] })
}));

export const auditLogsRelations = relations(auditLogs, ({ one, many }) => ({
  store: one(stores, { fields: [auditLogs.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [auditLogs.branchId], references: [branches.id] }),
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
  events: many(businessEvents)
}));

export const businessEventsRelations = relations(businessEvents, ({ one }) => ({
  store: one(stores, { fields: [businessEvents.storeId], references: [stores.id] }),
  branch: one(branches, { fields: [businessEvents.branchId], references: [branches.id] }),
  auditLog: one(auditLogs, { fields: [businessEvents.auditLogId], references: [auditLogs.id] })
}));

export const backupsRelations = relations(backups, ({ one }) => ({
  store: one(stores, { fields: [backups.storeId], references: [stores.id] }),
  createdBy: one(users, { fields: [backups.createdByUserId], references: [users.id] })
}));
