import type { CoreResult } from "@orix/core";
import { ok } from "@orix/core";
import type { ApplicationServiceContext } from "./service-context.js";

export type AuthorizationContext = {
  readonly actorId: string;
  readonly permission?: string;
};

export interface AuthorizationPolicy<TInput, TRepositories> {
  authorize(
    input: TInput,
    context: ApplicationServiceContext<TRepositories>,
    authorization: AuthorizationContext
  ): Promise<CoreResult<void>>;
}

export const allowAllPolicy = <TInput, TRepositories>(): AuthorizationPolicy<
  TInput,
  TRepositories
> => ({
  authorize: () => Promise.resolve(ok(undefined))
});
