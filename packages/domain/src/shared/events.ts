import type { UtcIsoDateTime, UserId, Uuid } from "@orix/shared";

export type DomainEventName = string;

export type DomainEvent<TName extends DomainEventName, TPayload extends object> = {
  readonly id: Uuid;
  readonly name: TName;
  readonly occurredAt: UtcIsoDateTime;
  readonly producedByUserId?: UserId;
  readonly payload: TPayload;
};
