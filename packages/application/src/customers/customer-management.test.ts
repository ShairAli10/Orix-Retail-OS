import { describe, expect, it } from "vitest";
import { ok, type CoreResult, type EventPublisher, type TransactionContext } from "@orix/core";
import type { RepositoryFactory } from "@orix/repositories";
import { CustomerManagementApplicationService } from "./customer-management.js";

const context = () => {
  const events: string[] = [];
  let transactionCount = 0;
  const repositories = {
    customers: {
      phoneExists: () => ok(false),
      getCustomer: () =>
        ok({
          id: "customer-1",
          name: "Ali Store",
          phone: "03001234567",
          email: null,
          address: null,
          city: "Lahore",
          cnic: null,
          tags: [],
          customerType: "regular",
          outstandingBalanceMinor: 5000,
          creditLimitMinor: 100000,
          lastPurchaseAt: null,
          status: "active",
          archivedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          notes: null,
          openingBalanceMinor: 5000,
          openingBalanceDate: "2026-01-01",
          createdByUserId: "user-1",
          updatedByUserId: "user-1"
        }),
      createCustomer: () =>
        ok({
          id: "customer-1",
          name: "Ali Store",
          phone: "03001234567",
          email: null,
          address: null,
          city: null,
          cnic: null,
          tags: [],
          customerType: "regular",
          outstandingBalanceMinor: 0,
          creditLimitMinor: 0,
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
          customerId: "customer-1",
          paymentNumber: "CR-000001",
          amountMinor: 2500,
          paidAt: "2026-01-01T10:00:00.000Z",
          method: "cash",
          notes: null
        })
    }
  } as unknown as RepositoryFactory;

  const service = new CustomerManagementApplicationService({
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

describe("CustomerManagementApplicationService", () => {
  it("rejects invalid customer details before opening a transaction", async () => {
    const setup = context();
    const result = await setup.service.createCustomer({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      name: "",
      phone: "123",
      tags: [],
      customerType: "regular",
      creditLimitMinor: -1,
      openingBalanceMinor: 0
    });

    expect(result.ok).toBe(false);
    expect(setup.transactionCount()).toBe(0);
  });

  it("records payment inside a transaction and publishes event after success", async () => {
    const setup = context();
    const result = await setup.service.recordPayment({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      customerId: "customer-1",
      amountMinor: 2500,
      paymentMethod: "cash",
      paidAt: "2026-01-01T10:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(setup.transactionCount()).toBe(1);
    expect(setup.events).toEqual(["CustomerPaymentReceived"]);
  });
});
