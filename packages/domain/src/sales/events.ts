import type { SaleId, StoreId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type SaleCreated = DomainEvent<
  "SaleCreated",
  { readonly storeId: StoreId; readonly saleId: SaleId }
>;
export type SaleCompleted = DomainEvent<"SaleCompleted", { readonly saleId: SaleId }>;
export type SaleCancelled = DomainEvent<
  "SaleCancelled",
  { readonly saleId: SaleId; readonly reason: string }
>;
export type SaleReturned = DomainEvent<
  "SaleReturned",
  { readonly saleId: SaleId; readonly reason: string }
>;

export type SaleEvent = SaleCreated | SaleCompleted | SaleCancelled | SaleReturned;
