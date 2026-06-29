import type { CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import { applicationError } from "./errors.js";

export type ApplicationValidator<TInput> = (input: TInput) => Promise<CoreResult<void>>;

export const validateRequest = async <TInput>(
  input: TInput,
  validators: readonly ApplicationValidator<TInput>[]
): Promise<CoreResult<void>> => {
  for (const validator of validators) {
    const result = await validator(input);
    if (!result.ok) {
      return result;
    }
  }

  return ok(undefined);
};

export const requireStringFields =
  <TInput extends Record<string, unknown>>(
    fields: readonly (keyof TInput & string)[]
  ): ApplicationValidator<TInput> =>
  (input) => {
    const missing = fields.filter((field) => {
      const value = input[field];
      return typeof value !== "string" || value.trim().length === 0;
    });

    if (missing.length > 0) {
      return Promise.resolve(
        err(
          applicationError("APPLICATION_VALIDATION_FAILED", "Required fields are missing", {
            fields: missing
          })
        )
      );
    }

    return Promise.resolve(ok(undefined));
  };

export const requirePositiveNumber =
  <TInput extends Record<string, unknown>>(
    field: keyof TInput & string
  ): ApplicationValidator<TInput> =>
  (input) => {
    const value = input[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return Promise.resolve(
        err(
          applicationError(
            "APPLICATION_VALIDATION_FAILED",
            "A positive numeric value is required",
            {
              field
            }
          )
        )
      );
    }

    return Promise.resolve(ok(undefined));
  };
