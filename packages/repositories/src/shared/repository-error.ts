import type { CoreError } from "@orix/core";

export type RepositoryErrorCode =
  | "REPOSITORY_READ_FAILED"
  | "REPOSITORY_WRITE_FAILED"
  | "REPOSITORY_DELETE_FAILED"
  | "REPOSITORY_CONFLICT"
  | "REPOSITORY_NOT_FOUND";

export const repositoryError = (
  code: RepositoryErrorCode,
  message: string,
  cause?: unknown
): CoreError => ({
  code,
  message,
  severity: code === "REPOSITORY_CONFLICT" ? "warning" : "error",
  cause
});
