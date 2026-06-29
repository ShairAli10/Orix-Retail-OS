import type { CoreResult, TransactionContext, TransactionMetadata } from "@orix/core";

export type ApplicationTransactionScope<T> = (
  transaction: TransactionContext
) => Promise<CoreResult<T>>;

export type ApplicationTransactionOptions = {
  readonly name: string;
  readonly metadata?: TransactionMetadata;
};

export interface ApplicationTransactionRunner {
  run<T>(
    options: ApplicationTransactionOptions,
    scope: ApplicationTransactionScope<T>
  ): Promise<CoreResult<T>>;
}
