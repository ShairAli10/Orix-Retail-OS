import type { CoreResult } from "./result.js";

export type ValidationIssue = {
  readonly path: readonly string[];
  readonly code: string;
  readonly message: string;
};

export type ValidationResult<T> = CoreResult<T>;

export interface Validator<TInput, TOutput = TInput> {
  validate(input: TInput): ValidationResult<TOutput>;
}

export interface AsyncValidator<TInput, TOutput = TInput> {
  validate(input: TInput): Promise<ValidationResult<TOutput>>;
}
