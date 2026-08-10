import type { ApplicationEvent, EventPublisher, TransactionContext } from "@orix/core";
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

const createService = (options: {
  readonly currentStock: number;
  readonly hasOpeningStock: boolean;
  readonly publishedEvents?: ApplicationEvent[];
}): InventoryManagementApplicationService => {
  const stockTake = {
    id: "stock-take",
    countNumber: "ST-000001",
    scopeType: "full" as const,
    status: "draft" as const,
    startedAt: "2026-06-29T00:00:00.000Z",
    completedAt: null,
    itemCount: 1,
    varianceCount: 0,
    notes: null,
    createdByUserId: "user",
    completedByUserId: null,
    items: [
      {
        id: "stock-take-item",
        productId: "product",
        productName: "Test Product",
        barcode: "1001",
        sku: null,
        expectedQuantity: 2,
        countedQuantity: null,
        varianceQuantity: null,
        adjustmentInventoryTransactionId: null
      }
    ]
  };
  const repositories = {
    inventory: {
      productExists: () => ok(true),
      currentStock: () => ok(options.currentStock),
      hasOpeningStock: () => ok(options.hasOpeningStock),
      createTransaction: () => ok("inventory-transaction"),
      listStockTakes: () => ok([stockTake]),
      getStockTake: () => ok(stockTake),
      startStockTake: () => ok(stockTake),
      completeStockTake: () =>
        ok({
          ...stockTake,
          status: "completed" as const,
          completedAt: "2026-06-29T01:00:00.000Z",
          completedByUserId: "user",
          varianceCount: 1,
          items: stockTake.items.map((item) => ({
            ...item,
            countedQuantity: 3,
            varianceQuantity: 1,
            adjustmentInventoryTransactionId: "inventory-transaction"
          }))
        })
    }
  } as unknown as RepositoryFactory;
  const publisher: EventPublisher = {
    publish: (event) => {
      options.publishedEvents?.push(event);
      return Promise.resolve(ok(undefined));
    }
  };

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

  it("starts a stock take and publishes the count-started event", async () => {
    const publishedEvents: ApplicationEvent[] = [];
    const service = createService({ currentStock: 2, hasOpeningStock: false, publishedEvents });

    const result = await service.startStockTake({
      storeId: "store",
      branchId: "branch",
      businessDayId: "day",
      userId: "user",
      scopeType: "full",
      productIds: [],
      startedAt: "2026-06-29T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(publishedEvents.map((event) => event.name)).toEqual(["InventoryCountStarted"]);
  });

  it("posts stock take variances and publishes inventory events after commit", async () => {
    const publishedEvents: ApplicationEvent[] = [];
    const service = createService({ currentStock: 2, hasOpeningStock: false, publishedEvents });

    const result = await service.completeStockTake({
      countId: "stock-take",
      storeId: "store",
      branchId: "branch",
      businessDayId: "day",
      userId: "user",
      completedAt: "2026-06-29T01:00:00.000Z",
      counts: [{ productId: "product", countedQuantity: 3 }]
    });

    expect(result.ok).toBe(true);
    expect(publishedEvents.map((event) => event.name)).toEqual([
      "InventoryCountCompleted",
      "InventoryAdjusted"
    ]);
  });

  it("rejects stock take completion when counted quantities are invalid", async () => {
    const service = createService({ currentStock: 2, hasOpeningStock: false });

    const result = await service.completeStockTake({
      countId: "stock-take",
      storeId: "store",
      branchId: "branch",
      businessDayId: "day",
      userId: "user",
      completedAt: "2026-06-29T01:00:00.000Z",
      counts: [{ productId: "product", countedQuantity: -1 }]
    });

    expect(result.ok).toBe(false);
  });
});
