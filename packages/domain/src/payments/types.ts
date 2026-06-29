import type { CashAccountId, CustomerId, Money, SupplierId } from "@orix/shared";
import type { DocumentNumber, PostedAt } from "../shared/index.js";

export type PaymentStatus = "draft" | "recorded" | "reversed" | "cancelled";

export type CustomerPaymentContract = {
  readonly paymentNumber: DocumentNumber;
  readonly customerId: CustomerId;
  readonly cashAccountId: CashAccountId;
  readonly amount: Money;
  readonly status: PaymentStatus;
  readonly paidAt?: PostedAt;
};

export type SupplierPaymentContract = {
  readonly paymentNumber: DocumentNumber;
  readonly supplierId: SupplierId;
  readonly cashAccountId: CashAccountId;
  readonly amount: Money;
  readonly status: PaymentStatus;
  readonly paidAt?: PostedAt;
};
