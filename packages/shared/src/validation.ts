import { z, type ZodType } from "zod";
import { err, ok, type Result } from "./result.js";

export type ValidationIssue = {
  readonly path: readonly (string | number)[];
  readonly message: string;
};

export type ValidationError = {
  readonly code: "validation.failed";
  readonly issues: readonly ValidationIssue[];
};

export const parseWithSchema = <T>(
  schema: ZodType<T>,
  input: unknown
): Result<T, ValidationError> => {
  const result = schema.safeParse(input);

  if (result.success) {
    return ok(result.data);
  }

  return err({
    code: "validation.failed",
    issues: result.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message
    }))
  });
};

export const nonEmptyStringSchema = z.string().trim().min(1);
