import type { CoreErrorContext } from "./errors.js";

export type LogContext = CoreErrorContext;

export type AuditLogEntry = {
  readonly action: string;
  readonly actorId?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly context?: LogContext;
};

export interface Logger {
  debug(message: string, context?: LogContext): void;

  info(message: string, context?: LogContext): void;

  warning(message: string, context?: LogContext): void;

  error(message: string, error?: unknown, context?: LogContext): void;

  audit(entry: AuditLogEntry): void;
}
