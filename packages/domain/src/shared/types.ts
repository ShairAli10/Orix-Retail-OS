import type { UtcIsoDateTime, UserId, Uuid } from "@orix/shared";

export type DomainStatus = "draft" | "active" | "on_hold" | "archived";

export type AuditStamp = {
  readonly createdAt: UtcIsoDateTime;
  readonly createdByUserId: UserId;
  readonly updatedAt?: UtcIsoDateTime;
  readonly updatedByUserId?: UserId;
};

export type VersionedContract = {
  readonly version: number;
};

export type DomainReference = {
  readonly type: string;
  readonly id: Uuid;
};
