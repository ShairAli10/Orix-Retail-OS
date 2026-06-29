import type { CoreResult } from "./result.js";

export type SequenceName = string;

export type SequentialNumberRequest = {
  readonly sequenceName: SequenceName;
  readonly scope?: string;
};

export interface IdGenerator {
  uuid(): string;
}

export interface SequentialNumberGenerator {
  next(request: SequentialNumberRequest): Promise<CoreResult<number>>;

  peek(request: SequentialNumberRequest): Promise<CoreResult<number>>;
}
