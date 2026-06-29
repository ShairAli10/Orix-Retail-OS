import type { DatabaseConnection } from "@orix/database";
import { AuditRepository } from "../audit/audit-repository.js";
import { CustomerRepository } from "../customers/customer-repository.js";
import { BusinessEventRepository } from "../events/business-event-repository.js";
import { ExpenseRepository } from "../expenses/expense-repository.js";
import { InventoryRepository } from "../inventory/inventory-repository.js";
import { LedgerRepository } from "../ledger/ledger-repository.js";
import {
  CustomerPaymentRepository,
  SupplierPaymentRepository
} from "../payments/payment-repository.js";
import { ProductRepository } from "../products/product-repository.js";
import { ProductManagementRepository } from "../products/product-management-repository.js";
import { PurchaseRepository } from "../purchases/purchase-repository.js";
import { SaleRepository } from "../sales/sale-repository.js";
import { SettingsRepository } from "../settings/settings-repository.js";
import { SupplierRepository } from "../suppliers/supplier-repository.js";
import { UserRepository } from "../users/user-repository.js";

export type RepositoryConnection = Pick<DatabaseConnection, "drizzle" | "sqlite">;

export type RepositoryFactory = {
  readonly customers: CustomerRepository;
  readonly suppliers: SupplierRepository;
  readonly products: ProductRepository;
  readonly productManagement: ProductManagementRepository;
  readonly sales: SaleRepository;
  readonly purchases: PurchaseRepository;
  readonly inventory: InventoryRepository;
  readonly ledger: LedgerRepository;
  readonly customerPayments: CustomerPaymentRepository;
  readonly supplierPayments: SupplierPaymentRepository;
  readonly expenses: ExpenseRepository;
  readonly users: UserRepository;
  readonly settings: SettingsRepository;
  readonly audit: AuditRepository;
  readonly businessEvents: BusinessEventRepository;
};

export const createRepositories = (connection: RepositoryConnection): RepositoryFactory => ({
  customers: new CustomerRepository(connection),
  suppliers: new SupplierRepository(connection),
  products: new ProductRepository(connection),
  productManagement: new ProductManagementRepository(connection),
  sales: new SaleRepository(connection),
  purchases: new PurchaseRepository(connection),
  inventory: new InventoryRepository(connection),
  ledger: new LedgerRepository(connection),
  customerPayments: new CustomerPaymentRepository(connection),
  supplierPayments: new SupplierPaymentRepository(connection),
  expenses: new ExpenseRepository(connection),
  users: new UserRepository(connection),
  settings: new SettingsRepository(connection),
  audit: new AuditRepository(connection),
  businessEvents: new BusinessEventRepository(connection)
});
