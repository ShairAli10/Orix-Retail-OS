import type { InventoryTransactionId, ProductId, Quantity } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type InventoryAdjusted = DomainEvent<
  "InventoryAdjusted",
  {
    readonly productId: ProductId;
    readonly quantity: Quantity;
    readonly inventoryTransactionId: InventoryTransactionId;
  }
>;

export type InventoryCountCompleted = DomainEvent<
  "InventoryCountCompleted",
  {
    readonly countNumber: string;
  }
>;

export type InventoryEvent = InventoryAdjusted | InventoryCountCompleted;
