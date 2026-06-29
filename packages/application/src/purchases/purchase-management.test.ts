import { describe, expect, it } from "vitest";
import { ok, type CoreResult, type EventPublisher, type TransactionContext } from "@orix/core";
import type { RepositoryFactory } from "@orix/repositories";
import { PurchaseManagementApplicationService } from "./purchase-management.js";

const purchase = {
  id: "purchase-1",
  purchaseNumber: "PO-000001",
  invoiceNumber: "INV-1",
  supplierId: "supplier-1",
  supplierName: "Prime Supplier",
  purchaseDate: "2026-01-01T00:00:00.000Z",
  dueDate: null,
  itemCount: 1,
  totalMinor: 10000,
  paidMinor: 0,
  balanceMinor: 10000,
  paymentStatus: "unpaid" as const,
  status: "received" as const,
  receivedAt: "2026-01-01T10:00:00.000Z",
  cancelledAt: null,
  updatedAt: "2026-01-01T10:00:00.000Z",
  subtotalMinor: 10000,
  discountMinor: 0,
  taxMinor: 0,
  freightMinor: 0,
  otherChargesMinor: 0,
  notes: null,
  items: [
    {
      id: "item-1",
      productId: "product-1",
      productName: "Rice",
      unitId: "unit-1",
      unitName: "Kg",
      quantity: 10,
      unitCostMinor: 1000,
      discountMinor: 0,
      taxMinor: 0,
      lineTotalMinor: 10000
    }
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  createdByUserId: "user-1"
};

const context = () => {
  const events: string[] = [];
  let transactionCount = 0;
  const repositories = {
    purchases: {
      receivePurchase: () => ok(purchase)
    }
  } as unknown as RepositoryFactory;

  const service = new PurchaseManagementApplicationService({
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

describe("PurchaseManagementApplicationService", () => {
  it("receives purchase in a transaction and publishes purchase plus inventory events", async () => {
    const setup = context();
    const result = await setup.service.receivePurchase({
      id: "purchase-1",
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1"
    });

    expect(result.ok).toBe(true);
    expect(setup.transactionCount()).toBe(1);
    expect(setup.events).toEqual(["PurchaseReceived", "InventoryIncreasedFromPurchase"]);
  });
});
