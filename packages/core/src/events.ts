import type { CoreResult } from "./result.js";

export type EventId = string;

export type EventName = string;

export type EventVersion = number;

export type EventMetadata = Readonly<Record<string, unknown>>;

export interface EventEnvelope<TPayload = unknown> {
  readonly id: EventId;
  readonly name: EventName;
  readonly version: EventVersion;
  readonly occurredAt: string;
  readonly payload: TPayload;
  readonly metadata: EventMetadata;
}

export interface DomainEvent<TPayload = unknown> extends EventEnvelope<TPayload> {
  readonly kind: "domain";
}

export interface IntegrationEvent<TPayload = unknown> extends EventEnvelope<TPayload> {
  readonly kind: "integration";
}

export type ApplicationEvent<TPayload = unknown> =
  DomainEvent<TPayload> | IntegrationEvent<TPayload>;

export type EventHandler<TEvent extends ApplicationEvent = ApplicationEvent> = (
  event: TEvent
) => Promise<CoreResult<void>>;

export type EventSubscription = {
  readonly id: string;
  unsubscribe(): Promise<CoreResult<void>>;
};

export type EventReplayRequest = {
  readonly from?: string;
  readonly to?: string;
  readonly names?: readonly EventName[];
};

export interface EventPublisher {
  publish(event: ApplicationEvent): Promise<CoreResult<void>>;
}

export interface EventSubscriber {
  subscribe(eventName: EventName, handler: EventHandler): Promise<CoreResult<EventSubscription>>;
}

export interface EventDispatcher {
  dispatch(event: ApplicationEvent): Promise<CoreResult<void>>;
}

export interface EventReplayer {
  replay(request: EventReplayRequest): Promise<CoreResult<number>>;
}

export interface EventBus extends EventPublisher, EventSubscriber, EventDispatcher, EventReplayer {}
