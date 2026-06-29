import type { EventPublisher, TransactionContext } from "@orix/core";
import { ok } from "@orix/core";
import type { RepositoryFactory } from "@orix/repositories";
import { describe, expect, it } from "vitest";
import { ProductManagementApplicationService } from "./product-management.js";

const transaction = (): TransactionContext => ({
  id: "tx-product",
  depth: 0,
  isolationLevel: "immediate",
  metadata: {}
});

const publisher: EventPublisher = {
  publish: () => Promise.resolve(ok(undefined))
};

const createService = (referenced: boolean): ProductManagementApplicationService => {
  const repositories = {
    productManagement: {
      productNameExists: () => ok(false),
      barcodeExists: () => ok(false),
      productHasCompletedReferences: () => ok(referenced),
      archiveProduct: () => ok(undefined)
    }
  } as unknown as RepositoryFactory;

  return new ProductManagementApplicationService({
    repositories,
    eventPublisher: publisher,
    transactionRunner: {
      run: async (_options, scope) => scope(transaction())
    }
  });
};

describe("product management application service", () => {
  it("requires explicit confirmation when sale price is below purchase price", async () => {
    const service = createService(false);

    const result = await service.createProduct({
      storeId: "store",
      branchId: "branch",
      businessDayId: "day",
      userId: "user",
      name: "Below Cost Product",
      categoryId: "category",
      unitId: "unit",
      purchasePriceMinor: 500,
      salePriceMinor: 400,
      openingStock: 0,
      minimumStock: 0,
      active: true
    });

    expect(result.ok).toBe(false);
  });

  it("blocks archiving products referenced by completed documents", async () => {
    const service = createService(true);

    const result = await service.archiveProduct({
      id: "product",
      storeId: "store",
      userId: "user",
      timestamp: "2026-06-28T00:00:00.000Z"
    });

    expect(result.ok).toBe(false);
  });
});
