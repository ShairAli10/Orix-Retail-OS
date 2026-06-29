import type { CoreError } from "./errors.js";

export type Ok<T> = {
  readonly ok: true;
  readonly value: T;
};

export type Err<E> = {
  readonly ok: false;
  readonly error: E;
};

export type Result<T, E> = Ok<T> | Err<E>;

export type CoreResult<T> = Result<T, CoreError>;

export const ok = <T>(value: T): Ok<T> => ({
  ok: true,
  value
});

export const err = <E>(error: E): Err<E> => ({
  ok: false,
  error
});

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

export const mapResult = <T, U, E>(result: Result<T, E>, mapper: (value: T) => U): Result<U, E> =>
  isOk(result) ? ok(mapper(result.value)) : result;

export const mapError = <T, E, F>(result: Result<T, E>, mapper: (error: E) => F): Result<T, F> =>
  isOk(result) ? result : err(mapper(result.error));

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  isOk(result) ? result.value : fallback;
