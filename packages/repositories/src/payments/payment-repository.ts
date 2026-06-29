import { customerPayments, supplierPayments } from "@orix/database";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export class CustomerPaymentRepository extends BaseRepository<typeof customerPayments> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: customerPayments,
      tableName: "customer_payments",
      searchableColumns: [customerPayments.paymentNumber, customerPayments.notes],
      documentNumberColumn: customerPayments.paymentNumber,
      dateColumn: customerPayments.paidAt,
      sortableColumns: {
        paymentNumber: customerPayments.paymentNumber,
        paidAt: customerPayments.paidAt,
        createdAt: customerPayments.createdAt,
        status: customerPayments.status,
        amountMinor: customerPayments.amountMinor
      }
    });
  }
}

export class SupplierPaymentRepository extends BaseRepository<typeof supplierPayments> {
  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: supplierPayments,
      tableName: "supplier_payments",
      searchableColumns: [supplierPayments.paymentNumber, supplierPayments.notes],
      documentNumberColumn: supplierPayments.paymentNumber,
      dateColumn: supplierPayments.paidAt,
      sortableColumns: {
        paymentNumber: supplierPayments.paymentNumber,
        paidAt: supplierPayments.paidAt,
        createdAt: supplierPayments.createdAt,
        status: supplierPayments.status,
        amountMinor: supplierPayments.amountMinor
      }
    });
  }
}

export type PaymentRepositories = {
  readonly customerPayments: CustomerPaymentRepository;
  readonly supplierPayments: SupplierPaymentRepository;
};
