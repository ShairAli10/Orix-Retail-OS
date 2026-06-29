import type { StoreId, UserId } from "@orix/shared";
import type { AuditStamp } from "../shared/index.js";

export type UserStatus = "invited" | "active" | "suspended" | "archived";

export type UserContract = AuditStamp & {
  readonly id: UserId;
  readonly storeId: StoreId;
  readonly displayName: string;
  readonly username: string;
  readonly status: UserStatus;
};
