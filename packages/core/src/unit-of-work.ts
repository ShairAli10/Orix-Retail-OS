import type { CoreResult } from "./result.js";
import type { TransactionContext, TransactionMetadata, TransactionScope } from "./transaction.js";

export interface UnitOfWork {
  readonly context: TransactionContext | undefined;
  readonly isActive: boolean;
  readonly nestingDepth: number;

  begin(metadata?: TransactionMetadata): Promise<CoreResult<TransactionContext>>;

  run<T>(scope: TransactionScope<T>): Promise<CoreResult<T>>;

  commit(): Promise<CoreResult<void>>;

  rollback(): Promise<CoreResult<void>>;

  createNested(metadata?: TransactionMetadata): Promise<CoreResult<UnitOfWork>>;
}
