import type { ApplicationEvent, CoreResult } from "@orix/core";
import type { ApplicationServiceContext } from "./service-context.js";
import type {
  ApplicationTransactionOptions,
  ApplicationTransactionScope
} from "./transaction-runner.js";

export const runWithEvents = <T>(
  context: ApplicationServiceContext,
  events: readonly ApplicationEvent[],
  options: ApplicationTransactionOptions,
  scope: ApplicationTransactionScope<T>
): Promise<CoreResult<T>> =>
  context.transactionRunner.run(options, async (transaction) => {
    const result = await scope(transaction);
    if (!result.ok) return result;
    for (const event of events) {
      const published = await context.eventPublisher.publish(event);
      if (!published.ok) return published;
    }
    return result;
  });
