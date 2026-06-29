import type { PurchaseId, StoreId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type PurchaseCreated = DomainEvent<
  "PurchaseCreated",
  { readonly storeId: StoreId; readonly purchaseId: PurchaseId }
>;
export type PurchaseReceived = DomainEvent<"PurchaseReceived", { readonly purchaseId: PurchaseId }>;
export type PurchaseCancelled = DomainEvent<
  "PurchaseCancelled",
  { readonly purchaseId: PurchaseId; readonly reason: string }
>;

export type PurchaseEvent = PurchaseCreated | PurchaseReceived | PurchaseCancelled;
