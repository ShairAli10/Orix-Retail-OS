import type { InventoryTransactionId, ProductId, Quantity, StoreId } from "@orix/shared";
import type { PostedAt } from "../shared/index.js";

export type InventoryDirection = "increase" | "decrease";
export type InventoryMovementType =
  "opening_stock" | "sale" | "purchase" | "return" | "adjustment" | "stock_take";

export type InventoryTransactionContract = {
  readonly id: InventoryTransactionId;
  readonly storeId: StoreId;
  readonly productId: ProductId;
  readonly direction: InventoryDirection;
  readonly movementType: InventoryMovementType;
  readonly quantity: Quantity;
  readonly postedAt: PostedAt;
  readonly reason?: string;
};
