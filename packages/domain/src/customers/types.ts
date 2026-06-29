import type { CustomerId, Money, StoreId } from "@orix/shared";
import type { AuditStamp, DomainStatus } from "../shared/index.js";

export type CustomerStatus = Extract<DomainStatus, "draft" | "active" | "on_hold" | "archived">;

export type CustomerContract = AuditStamp & {
  readonly id: CustomerId;
  readonly storeId: StoreId;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly status: CustomerStatus;
  readonly creditAllowed: boolean;
  readonly creditLimit?: Money;
};
