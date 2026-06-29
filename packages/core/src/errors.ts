export type CoreErrorCode = string;

export type CoreErrorContext = Readonly<Record<string, unknown>>;

export type CoreErrorSeverity = "debug" | "info" | "warning" | "error" | "critical";

export type CoreError = {
  readonly code: CoreErrorCode;
  readonly message: string;
  readonly severity: CoreErrorSeverity;
  readonly context?: CoreErrorContext;
  readonly cause?: unknown;
};
