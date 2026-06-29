import type { UserId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type UserCreated = DomainEvent<"UserCreated", { readonly userId: UserId }>;
export type UserSuspended = DomainEvent<
  "UserSuspended",
  { readonly userId: UserId; readonly reason: string }
>;
export type UserRoleChanged = DomainEvent<"UserRoleChanged", { readonly userId: UserId }>;

export type UserEvent = UserCreated | UserSuspended | UserRoleChanged;
