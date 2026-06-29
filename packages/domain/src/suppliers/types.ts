import type { StoreId, SupplierId } from "@orix/shared";
import type { AuditStamp, DomainStatus } from "../shared/index.js";

export type SupplierStatus = Extract<DomainStatus, "draft" | "active" | "on_hold" | "archived">;

export type SupplierContract = AuditStamp & {
  readonly id: SupplierId;
  readonly storeId: StoreId;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly status: SupplierStatus;
  readonly paymentTerms?: string;
};
