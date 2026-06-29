import type { ProductId, StoreId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type ProductCreated = DomainEvent<
  "ProductCreated",
  {
    readonly storeId: StoreId;
    readonly productId: ProductId;
  }
>;

export type ProductArchived = DomainEvent<
  "ProductArchived",
  {
    readonly productId: ProductId;
    readonly reason: string;
  }
>;

export type ProductEvent = ProductCreated | ProductArchived;
