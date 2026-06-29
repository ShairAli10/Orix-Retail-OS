import type { Money, StoreId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type ExpenseRecorded = DomainEvent<
  "ExpenseRecorded",
  {
    readonly storeId: StoreId;
    readonly amount: Money;
    readonly categoryCode: string;
  }
>;

export type ExpenseEvent = ExpenseRecorded;
