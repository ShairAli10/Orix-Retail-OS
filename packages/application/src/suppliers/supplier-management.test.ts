import { describe, expect, it } from "vitest";
import { ok, type CoreResult, type EventPublisher, type TransactionContext } from "@orix/core";
import type { RepositoryFactory } from "@orix/repositories";
import { SupplierManagementApplicationService } from "./supplier-management.js";

const context = () => {
  const events: string[] = [];
  let transactionCount = 0;
  const repositories = {
    suppliers: {
      phoneExists: () => ok(false),
      getSupplier: () =>
        ok({
          id: "supplier-1",
          name: "Prime Supplier",
          phone: "03001234567",
          email: null,
          address: null,
          city: "Karachi",
          ntn: null,
          strn: null,
          tags: [],
          creditTerms: "Net 7",
          outstandingBalanceMinor: 10000,
          lastPurchaseAt: null,
          status: "active",
          archivedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          notes: null,
          openingBalanceMinor: 0,
          openingBalanceDate: null,
          createdByUserId: "user-1",
          updatedByUserId: "user-1"
        }),
      recordPayment: () =>
        ok({
          id: "payment-1",
          supplierId: "supplier-1",
          paymentNumber: "SP-000001",
          amountMinor: 5000,
          paidAt: "2026-01-01T10:00:00.000Z",
          method: "cash",
          notes: null
        })
    }
  } as unknown as RepositoryFactory;

  const service = new SupplierManagementApplicationService({
    repositories,
    transactionRunner: {
      run: async <T>(
        _options: { readonly name: string },
        scope: (transaction: TransactionContext) => Promise<CoreResult<T>>
      ) => {
        transactionCount += 1;
        return scope({ id: "tx", depth: 0, isolationLevel: "immediate", metadata: {} });
      }
    },
    eventPublisher: {
      publish: (event) => {
        events.push(event.name);
        return Promise.resolve(ok(undefined));
      }
    } satisfies EventPublisher
  });

  return { service, events, transactionCount: () => transactionCount };
};

describe("SupplierManagementApplicationService", () => {
  it("records supplier payment inside a transaction and publishes event", async () => {
    const setup = context();
    const result = await setup.service.recordPayment({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      supplierId: "supplier-1",
      amountMinor: 5000,
      paymentMethod: "cash",
      paidAt: "2026-01-01T10:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(setup.transactionCount()).toBe(1);
    expect(setup.events).toEqual(["SupplierPaymentRecorded"]);
  });
});
