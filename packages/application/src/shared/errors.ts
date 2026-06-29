import type { CoreError, CoreErrorContext } from "@orix/core";

export type ApplicationErrorCode =
  | "APPLICATION_VALIDATION_FAILED"
  | "APPLICATION_AUTHORIZATION_FAILED"
  | "APPLICATION_TRANSACTION_FAILED"
  | "APPLICATION_EVENT_PUBLISH_FAILED"
  | "APPLICATION_OPERATION_FAILED";

export const applicationError = (
  code: ApplicationErrorCode,
  message: string,
  context?: CoreErrorContext,
  cause?: unknown
): CoreError => {
  const error: CoreError = {
    code,
    message,
    severity: code === "APPLICATION_AUTHORIZATION_FAILED" ? "warning" : "error"
  };

  return {
    ...error,
    ...(context === undefined ? {} : { context }),
    ...(cause === undefined ? {} : { cause })
  };
};
