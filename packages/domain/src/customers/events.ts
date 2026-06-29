import type { CustomerId, StoreId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type CustomerCreated = DomainEvent<
  "CustomerCreated",
  {
    readonly storeId: StoreId;
    readonly customerId: CustomerId;
  }
>;

export type CustomerArchived = DomainEvent<
  "CustomerArchived",
  {
    readonly customerId: CustomerId;
    readonly reason: string;
  }
>;

export type CustomerEvent = CustomerCreated | CustomerArchived;
