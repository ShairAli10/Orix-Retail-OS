import type { CustomerId, Money, SaleId, StoreId } from "@orix/shared";
import type { DocumentNumber, PostedAt } from "../shared/index.js";

export type SaleStatus =
  "draft" | "completed" | "partially_paid" | "paid" | "cancelled" | "returned";

export type SaleContract = {
  readonly id: SaleId;
  readonly storeId: StoreId;
  readonly saleNumber: DocumentNumber;
  readonly customerId?: CustomerId;
  readonly status: SaleStatus;
  readonly total: Money;
  readonly paid: Money;
  readonly completedAt?: PostedAt;
};
