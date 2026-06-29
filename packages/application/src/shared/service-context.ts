import type { ApplicationEvent, EventPublisher } from "@orix/core";
import type { RepositoryFactory } from "@orix/repositories";
import type { ApplicationTransactionRunner } from "./transaction-runner.js";

export type ApplicationActor = {
  readonly actorId: string;
};

export type ApplicationServiceContext<TRepositories = RepositoryFactory> = {
  readonly repositories: TRepositories;
  readonly transactionRunner: ApplicationTransactionRunner;
  readonly eventPublisher: EventPublisher;
};

export type ApplicationEventCollector = {
  collect(event: ApplicationEvent): void;
  list(): readonly ApplicationEvent[];
};

export const createEventCollector = (): ApplicationEventCollector => {
  const events: ApplicationEvent[] = [];

  return {
    collect: (event) => {
      events.push(event);
    },
    list: () => events
  };
};
