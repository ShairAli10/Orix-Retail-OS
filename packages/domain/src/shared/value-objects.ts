import type { Money, Quantity, UtcIsoDateTime, Uuid } from "@orix/shared";

export type DocumentNumber = string;
export type BusinessDate = string;
export type PostedAt = UtcIsoDateTime;
export type ReversalReferenceId = Uuid;

export type MonetaryAmount = Money;
export type StockQuantity = Quantity;
