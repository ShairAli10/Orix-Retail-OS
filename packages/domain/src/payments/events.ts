import type { CustomerId, Money, SupplierId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type CustomerPaymentReceived = DomainEvent<
  "CustomerPaymentReceived",
  {
    readonly customerId: CustomerId;
    readonly amount: Money;
  }
>;

export type SupplierPaymentRecorded = DomainEvent<
  "SupplierPaymentRecorded",
  {
    readonly supplierId: SupplierId;
    readonly amount: Money;
  }
>;

export type PaymentEvent = CustomerPaymentReceived | SupplierPaymentRecorded;
