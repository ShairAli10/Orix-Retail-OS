import type { EventPublisher, TransactionContext } from "@orix/core";
import { ok } from "@orix/core";
import type { RepositoryFactory } from "@orix/repositories";
import { describe, expect, it } from "vitest";
import { InventoryManagementApplicationService } from "./inventory-management.js";

const transaction = (): TransactionContext => ({
  id: "tx-inventory",
  depth: 0,
  isolationLevel: "immediate",
  metadata: {}
});

const publisher: EventPublisher = {
  publish: () => Promise.resolve(ok(undefined))
};

const createService = (options: {
  readonly currentStock: number;
  readonly hasOpeningStock: boolean;
}): InventoryManagementApplicationService => {
  const repositories = {
    inventory: {
      productExists: () => ok(true),
      currentStock: () => ok(options.currentStock),
      hasOpeningStock: () => ok(options.hasOpeningStock),
      createTransaction: () => ok("inventory-transaction")
    }
  } as unknown as RepositoryFactory;

  return new InventoryManagementApplicationService({
    repositories,
    eventPublisher: publisher,
    transactionRunner: {
      run: (_options, scope) => scope(transaction())
    }
  });
};

describe("inventory management application service", () => {
  it("blocks stock decreases that would create negative stock", async () => {
    const service = createService({ currentStock: 2, hasOpeningStock: false });

    const result = await service.adjustStock({
      storeId: "store",
      branchId: "branch",
      businessDayId: "day",
      userId: "user",
      productId: "product",
      direction: "decrease",
      quantity: 3,
      reason: "manual-correction",
      occurredAt: "2026-06-29T00:00:00.000Z"
    });

    expect(result.ok).toBe(false);
  });

  it("prevents duplicate opening stock transactions for a product", async () => {
    const service = createService({ currentStock: 0, hasOpeningStock: true });

    const result = await service.recordOpeningStock({
      storeId: "store",
      branchId: "branch",
      businessDayId: "day",
      userId: "user",
      entries: [
        {
          productId: "product",
          quantity: 1,
          unitCostMinor: 100,
          occurredAt: "2026-06-29T00:00:00.000Z"
        }
      ]
    });

    expect(result.ok).toBe(false);
  });
});
