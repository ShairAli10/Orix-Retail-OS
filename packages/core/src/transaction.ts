import type { CoreResult } from "./result.js";

export type TransactionId = string;

export type TransactionIsolationLevel = "deferred" | "immediate" | "exclusive";

export type TransactionMetadata = Readonly<Record<string, unknown>>;

export type TransactionContext = {
  readonly id: TransactionId;
  readonly depth: number;
  readonly isolationLevel: TransactionIsolationLevel;
  readonly metadata: TransactionMetadata;
};

export type TransactionScope<T> = (context: TransactionContext) => Promise<CoreResult<T>>;

export interface TransactionManager {
  readonly currentContext: TransactionContext | undefined;

  run<T>(scope: TransactionScope<T>): Promise<CoreResult<T>>;

  begin(metadata?: TransactionMetadata): Promise<CoreResult<TransactionContext>>;

  commit(context: TransactionContext): Promise<CoreResult<void>>;

  rollback(context: TransactionContext): Promise<CoreResult<void>>;
}
