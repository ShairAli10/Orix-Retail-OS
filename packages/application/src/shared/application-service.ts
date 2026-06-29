import type { ApplicationEvent, CoreResult, TransactionContext } from "@orix/core";
import { err, ok } from "@orix/core";
import type { AuthorizationContext, AuthorizationPolicy } from "./authorization.js";
import { allowAllPolicy } from "./authorization.js";
import { applicationError } from "./errors.js";
import {
  createEventCollector,
  type ApplicationEventCollector,
  type ApplicationServiceContext
} from "./service-context.js";
import type { ApplicationValidator } from "./validation.js";
import { validateRequest } from "./validation.js";

export interface ApplicationService<TInput, TOutput> {
  execute(input: TInput): Promise<CoreResult<TOutput>>;
}

export type ApplicationOperationContext<TInput, TRepositories> = {
  readonly input: TInput;
  readonly repositories: TRepositories;
  readonly transaction: TransactionContext;
  readonly events: ApplicationEventCollector;
};

export type ApplicationOperation<TInput, TOutput, TRepositories> = (
  context: ApplicationOperationContext<TInput, TRepositories>
) => Promise<CoreResult<TOutput>>;

export type ApplicationServiceDefinition<TInput, TOutput, TRepositories> = {
  readonly name: string;
  readonly context: ApplicationServiceContext<TRepositories>;
  readonly authorization: AuthorizationContext;
  readonly validators: readonly ApplicationValidator<TInput>[];
  readonly authorizationPolicy?: AuthorizationPolicy<TInput, TRepositories>;
  readonly operation: ApplicationOperation<TInput, TOutput, TRepositories>;
};

export const createApplicationService = <TInput, TOutput, TRepositories>(
  definition: ApplicationServiceDefinition<TInput, TOutput, TRepositories>
): ApplicationService<TInput, TOutput> => ({
  execute: async (input) => {
    const validationResult = await validateRequest(input, definition.validators);
    if (!validationResult.ok) {
      return validationResult;
    }

    const policy = definition.authorizationPolicy ?? allowAllPolicy<TInput, TRepositories>();
    const authorizationResult = await policy.authorize(
      input,
      definition.context,
      definition.authorization
    );
    if (!authorizationResult.ok) {
      return authorizationResult;
    }

    const collector = createEventCollector();
    const transactionResult = await definition.context.transactionRunner.run(
      {
        name: definition.name,
        metadata: { actorId: definition.authorization.actorId }
      },
      (transaction) =>
        definition.operation({
          input,
          repositories: definition.context.repositories,
          transaction,
          events: collector
        })
    );

    if (!transactionResult.ok) {
      return transactionResult;
    }

    const publishResult = await publishCollectedEvents(
      collector.list(),
      definition.context.eventPublisher
    );
    if (!publishResult.ok) {
      return publishResult;
    }

    return ok(transactionResult.value);
  }
});

const publishCollectedEvents = async (
  events: readonly ApplicationEvent[],
  publisher: ApplicationServiceContext["eventPublisher"]
): Promise<CoreResult<void>> => {
  for (const event of events) {
    const result = await publisher.publish(event);
    if (!result.ok) {
      return err(
        applicationError(
          "APPLICATION_EVENT_PUBLISH_FAILED",
          "Failed to publish application event after commit",
          { eventName: event.name },
          result.error
        )
      );
    }
  }

  return ok(undefined);
};
