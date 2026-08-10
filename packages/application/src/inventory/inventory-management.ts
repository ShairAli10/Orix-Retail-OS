import { randomUUID } from "node:crypto";
import type { ApplicationEvent, CoreError, CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type {
  InventoryListQuery,
  InventoryMovementPage,
  InventoryMovementQuery,
  InventoryOverview,
  InventoryPage,
  InventoryTransactionWrite,
  StockTakeCompleteWrite,
  StockTakeDetail,
  StockTakeListItem,
  StockTakeStartWrite
} from "@orix/repositories";
import { applicationError } from "../shared/errors.js";
import type { ApplicationServiceContext } from "../shared/service-context.js";

export type InventoryAdjustmentInput = {
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly productId: string;
  readonly direction: "increase" | "decrease";
  readonly quantity: number;
  readonly unitCostMinor?: number | null;
  readonly reason:
    | "opening-stock"
    | "damaged"
    | "expired"
    | "lost"
    | "found"
    | "manual-correction"
    | "stock-count-difference"
    | "supplier-replacement";
  readonly occurredAt: string;
  readonly notes?: string | null;
};

export type OpeningStockEntryInput = {
  readonly productId: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly occurredAt: string;
  readonly notes?: string | null;
};

export type OpeningStockBulkInput = {
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly entries: readonly OpeningStockEntryInput[];
};

export type StockTakeStartInput = StockTakeStartWrite;
export type StockTakeCompleteInput = StockTakeCompleteWrite;

const validationError = (message: string, fields?: readonly string[]): CoreError =>
  applicationError(
    "APPLICATION_VALIDATION_FAILED",
    message,
    fields === undefined ? undefined : { fields }
  );

const operationError = (message: string): CoreError =>
  applicationError("APPLICATION_OPERATION_FAILED", message);

export class InventoryManagementApplicationService {
  public constructor(private readonly context: ApplicationServiceContext) {}

  public overview(storeId: string): CoreResult<InventoryOverview> {
    return this.context.repositories.inventory.overview(storeId);
  }

  public listInventory(query: InventoryListQuery): CoreResult<InventoryPage> {
    return this.context.repositories.inventory.listInventory(query);
  }

  public listMovements(query: InventoryMovementQuery): CoreResult<InventoryMovementPage> {
    return this.context.repositories.inventory.listMovements(query);
  }

  public listStockTakes(storeId: string): CoreResult<readonly StockTakeListItem[]> {
    return this.context.repositories.inventory.listStockTakes(storeId);
  }

  public getStockTake(id: string): CoreResult<StockTakeDetail | undefined> {
    return this.context.repositories.inventory.getStockTake(id);
  }

  public async adjustStock(
    input: InventoryAdjustmentInput
  ): Promise<CoreResult<{ readonly transactionId: string }>> {
    const validation = this.validateAdjustment(input);
    if (!validation.ok) {
      return validation;
    }

    const product = this.context.repositories.inventory.productExists(
      input.productId,
      input.storeId
    );
    if (!product.ok) {
      return product;
    }
    if (!product.value) {
      return err(operationError("Product was not found or is archived."));
    }

    const currentStock = this.context.repositories.inventory.currentStock(input.productId);
    if (!currentStock.ok) {
      return currentStock;
    }
    if (input.direction === "decrease" && currentStock.value < input.quantity) {
      return err(operationError("Stock adjustment cannot make inventory negative."));
    }

    const transactionId = randomUUID();
    const sourceId = randomUUID();
    const write: InventoryTransactionWrite = {
      id: transactionId,
      storeId: input.storeId,
      branchId: input.branchId,
      businessDayId: input.businessDayId,
      productId: input.productId,
      sourceType: "stock-adjustment",
      sourceId,
      movementType: input.reason,
      direction: input.direction === "increase" ? "in" : "out",
      quantity: input.quantity,
      unitCostMinor: input.unitCostMinor ?? null,
      reason: input.reason,
      notes: input.notes ?? null,
      postedAt: input.occurredAt,
      userId: input.userId
    };
    const events = [
      this.event("InventoryAdjusted", transactionId, input.storeId, input.userId, input.occurredAt)
    ];
    const result = await this.context.transactionRunner.run(
      { name: "inventory.adjust-stock", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.inventory.createTransaction(write))
    );
    const output = result.ok ? ok({ transactionId: result.value }) : result;
    return this.publishAfterCommit(output, events);
  }

  public async recordOpeningStock(
    input: OpeningStockBulkInput
  ): Promise<CoreResult<{ readonly transactionIds: readonly string[] }>> {
    if (input.entries.length === 0) {
      return err(validationError("At least one opening stock entry is required.", ["entries"]));
    }
    const duplicateProduct = new Set<string>();
    for (const entry of input.entries) {
      if (duplicateProduct.has(entry.productId)) {
        return err(
          validationError("Opening stock import contains duplicate products.", ["productId"])
        );
      }
      duplicateProduct.add(entry.productId);
      if (entry.quantity <= 0 || entry.unitCostMinor < 0) {
        return err(
          validationError("Opening stock quantity must be positive and cost cannot be negative.")
        );
      }
      const exists = this.context.repositories.inventory.productExists(
        entry.productId,
        input.storeId
      );
      if (!exists.ok) {
        return exists;
      }
      if (!exists.value) {
        return err(operationError("One or more products were not found."));
      }
      const hasOpeningStock = this.context.repositories.inventory.hasOpeningStock(entry.productId);
      if (!hasOpeningStock.ok) {
        return hasOpeningStock;
      }
      if (hasOpeningStock.value) {
        return err(operationError("Opening stock already exists for one or more products."));
      }
    }

    const transactionIds = input.entries.map(() => randomUUID());
    const writes = input.entries.map((entry, index): InventoryTransactionWrite => ({
      id: transactionIds[index] ?? randomUUID(),
      storeId: input.storeId,
      branchId: input.branchId,
      businessDayId: input.businessDayId,
      productId: entry.productId,
      sourceType: "opening-stock",
      sourceId: randomUUID(),
      movementType: "opening-stock",
      direction: "in",
      quantity: entry.quantity,
      unitCostMinor: entry.unitCostMinor,
      reason: "opening-stock",
      notes: entry.notes ?? null,
      postedAt: entry.occurredAt,
      userId: input.userId
    }));
    const events = transactionIds.map((id) =>
      this.event("OpeningStockRecorded", id, input.storeId, input.userId, new Date().toISOString())
    );
    const result = await this.context.transactionRunner.run(
      { name: "inventory.opening-stock", metadata: { actorId: input.userId } },
      () => {
        for (const write of writes) {
          const created = this.context.repositories.inventory.createTransaction(write);
          if (!created.ok) {
            return Promise.resolve(created);
          }
        }
        return Promise.resolve(ok(transactionIds));
      }
    );
    const output = result.ok ? ok({ transactionIds: result.value }) : result;
    return this.publishAfterCommit(output, events);
  }

  public async startStockTake(
    input: StockTakeStartInput
  ): Promise<CoreResult<{ readonly stockTake: StockTakeDetail }>> {
    const validation = this.validateStockTakeStart(input);
    if (!validation.ok) return validation;
    const events: ApplicationEvent[] = [];
    const result = await this.context.transactionRunner.run(
      { name: "inventory.stock-take.start", metadata: { actorId: input.userId } },
      () => {
        const stockTake = this.context.repositories.inventory.startStockTake(input);
        if (!stockTake.ok) return Promise.resolve(stockTake);
        events.push(
          this.event(
            "InventoryCountStarted",
            stockTake.value.id,
            input.storeId,
            input.userId,
            input.startedAt
          )
        );
        return Promise.resolve(ok({ stockTake: stockTake.value }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  public async completeStockTake(
    input: StockTakeCompleteInput
  ): Promise<CoreResult<{ readonly stockTake: StockTakeDetail }>> {
    const validation = this.validateStockTakeComplete(input);
    if (!validation.ok) return validation;
    const events: ApplicationEvent[] = [];
    const result = await this.context.transactionRunner.run(
      { name: "inventory.stock-take.complete", metadata: { actorId: input.userId } },
      () => {
        const stockTake = this.context.repositories.inventory.completeStockTake(input);
        if (!stockTake.ok) return Promise.resolve(stockTake);
        events.push(
          this.event(
            "InventoryCountCompleted",
            stockTake.value.id,
            input.storeId,
            input.userId,
            input.completedAt
          )
        );
        if (stockTake.value.varianceCount > 0) {
          events.push(
            this.event(
              "InventoryAdjusted",
              stockTake.value.id,
              input.storeId,
              input.userId,
              input.completedAt
            )
          );
        }
        return Promise.resolve(ok({ stockTake: stockTake.value }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  private validateAdjustment(input: InventoryAdjustmentInput): CoreResult<void> {
    const fields: string[] = [];
    if (input.productId.trim() === "") fields.push("productId");
    if (input.quantity <= 0) fields.push("quantity");
    if (input.occurredAt.trim() === "") fields.push("occurredAt");
    if (fields.length > 0) {
      return err(validationError("Inventory adjustment is missing required fields.", fields));
    }
    return ok(undefined);
  }

  private validateStockTakeStart(input: StockTakeStartInput): CoreResult<void> {
    const fields: string[] = [];
    if (input.startedAt.trim() === "") fields.push("startedAt");
    if (input.scopeType === "partial" && input.productIds.length === 0) fields.push("productIds");
    return fields.length > 0
      ? err(validationError("Stock take setup is missing required fields.", fields))
      : ok(undefined);
  }

  private validateStockTakeComplete(input: StockTakeCompleteInput): CoreResult<void> {
    const fields: string[] = [];
    if (input.countId.trim() === "") fields.push("countId");
    if (input.completedAt.trim() === "") fields.push("completedAt");
    if (input.counts.length === 0) fields.push("counts");
    for (const count of input.counts) {
      if (count.productId.trim() === "") fields.push("productId");
      if (count.countedQuantity < 0) fields.push("countedQuantity");
    }
    return fields.length > 0
      ? err(validationError("Stock take counts are missing or invalid.", [...new Set(fields)]))
      : ok(undefined);
  }

  private event(
    name: string,
    entityId: string,
    storeId: string,
    actorId: string,
    occurredAt: string
  ): ApplicationEvent {
    return {
      id: randomUUID(),
      kind: "domain",
      name,
      version: 1,
      occurredAt,
      payload: { entityId },
      metadata: { storeId, actorId }
    };
  }

  private async publishAfterCommit<T>(
    result: CoreResult<T>,
    events: readonly ApplicationEvent[]
  ): Promise<CoreResult<T>> {
    if (!result.ok) {
      return result;
    }
    for (const event of events) {
      const published = await this.context.eventPublisher.publish(event);
      if (!published.ok) {
        return err(published.error);
      }
    }
    return result;
  }
}
