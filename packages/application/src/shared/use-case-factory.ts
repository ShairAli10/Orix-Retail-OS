import type { RepositoryFactory } from "@orix/repositories";
import type { AuthorizationContext, AuthorizationPolicy } from "./authorization.js";
import type {
  ApplicationOperation,
  ApplicationService,
  ApplicationServiceDefinition
} from "./application-service.js";
import { createApplicationService } from "./application-service.js";
import type { ApplicationServiceContext } from "./service-context.js";
import { requireStringFields, type ApplicationValidator } from "./validation.js";

export type UseCaseFactoryOptions<TInput extends Record<string, unknown>, TOutput> = {
  readonly context: ApplicationServiceContext;
  readonly actorId: string;
  readonly operation: ApplicationOperation<TInput, TOutput, RepositoryFactory>;
  readonly authorizationPolicy?: AuthorizationPolicy<TInput, RepositoryFactory>;
};

export type RepositoryApplicationOperation<
  TInput extends Record<string, unknown>,
  TOutput
> = ApplicationOperation<TInput, TOutput, RepositoryFactory>;

export type UseCaseMetadata<TInput extends Record<string, unknown>> = {
  readonly name: string;
  readonly requiredFields: readonly (keyof TInput & string)[];
  readonly validators?: readonly ApplicationValidator<TInput>[];
  readonly permission?: string;
};

export const createRepositoryUseCase = <TInput extends Record<string, unknown>, TOutput>(
  metadata: UseCaseMetadata<TInput>,
  options: UseCaseFactoryOptions<TInput, TOutput>
): ApplicationService<TInput, TOutput> => {
  const authorization: AuthorizationContext =
    metadata.permission === undefined
      ? { actorId: options.actorId }
      : { actorId: options.actorId, permission: metadata.permission };
  const baseDefinition = {
    name: metadata.name,
    context: options.context,
    authorization,
    validators: [
      requireStringFields<TInput>(metadata.requiredFields),
      ...(metadata.validators ?? [])
    ],
    operation: options.operation
  };
  const definition: ApplicationServiceDefinition<TInput, TOutput, RepositoryFactory> =
    options.authorizationPolicy === undefined
      ? baseDefinition
      : { ...baseDefinition, authorizationPolicy: options.authorizationPolicy };

  return createApplicationService(definition);
};
