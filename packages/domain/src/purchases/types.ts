import type { Money, PurchaseId, StoreId, SupplierId } from "@orix/shared";
import type { DocumentNumber, PostedAt } from "../shared/index.js";

export type PurchaseStatus =
  "draft" | "approved" | "received" | "partially_paid" | "paid" | "cancelled";

export type PurchaseContract = {
  readonly id: PurchaseId;
  readonly storeId: StoreId;
  readonly supplierId: SupplierId;
  readonly purchaseNumber: DocumentNumber;
  readonly status: PurchaseStatus;
  readonly total: Money;
  readonly paid: Money;
  readonly receivedAt?: PostedAt;
};
