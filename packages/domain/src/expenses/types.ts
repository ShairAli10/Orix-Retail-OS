import type { CashAccountId, Money, StoreId } from "@orix/shared";
import type { DocumentNumber, PostedAt } from "../shared/index.js";

export type ExpenseStatus = "draft" | "approved" | "recorded" | "reversed" | "cancelled";

export type ExpenseContract = {
  readonly storeId: StoreId;
  readonly expenseNumber: DocumentNumber;
  readonly cashAccountId: CashAccountId;
  readonly categoryCode: string;
  readonly amount: Money;
  readonly status: ExpenseStatus;
  readonly postedAt?: PostedAt;
};
