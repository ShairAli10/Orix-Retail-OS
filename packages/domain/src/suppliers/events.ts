import type { StoreId, SupplierId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type SupplierCreated = DomainEvent<
  "SupplierCreated",
  {
    readonly storeId: StoreId;
    readonly supplierId: SupplierId;
  }
>;

export type SupplierArchived = DomainEvent<
  "SupplierArchived",
  {
    readonly supplierId: SupplierId;
    readonly reason: string;
  }
>;

export type SupplierEvent = SupplierCreated | SupplierArchived;
