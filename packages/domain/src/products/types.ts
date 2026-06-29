import type { ProductId, Quantity, StoreId } from "@orix/shared";
import type { AuditStamp } from "../shared/index.js";

export type ProductStatus = "draft" | "active" | "archived";

export type ProductContract = AuditStamp & {
  readonly id: ProductId;
  readonly storeId: StoreId;
  readonly name: string;
  readonly sku?: string;
  readonly barcode?: string;
  readonly status: ProductStatus;
  readonly isStockTracked: boolean;
  readonly reorderLevel?: Quantity;
};
