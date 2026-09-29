import { randomUUID } from "node:crypto";
import {
  err,
  ok,
  type CoreResult,
  type ApplicationEvent,
  type EventPublisher,
  type TransactionContext
} from "@orix/core";
import type { DatabaseConnection } from "@orix/database";

export class SqliteTransactionRunner {
  public constructor(private readonly connection: DatabaseConnection) {}

  public async run<T>(
    options: { readonly name: string; readonly metadata?: Readonly<Record<string, unknown>> },
    scope: (transaction: TransactionContext) => Promise<CoreResult<T>>
  ): Promise<CoreResult<T>> {
    const transaction: TransactionContext = {
      id: randomUUID(),
      depth: 0,
      isolationLevel: "immediate",
      metadata: { name: options.name, ...(options.metadata ?? {}) }
    };

    try {
      this.connection.sqlite.prepare("BEGIN IMMEDIATE").run();
      const result = await scope(transaction);
      if (result.ok) {
        this.connection.sqlite.prepare("COMMIT").run();
      } else {
        this.connection.sqlite.prepare("ROLLBACK").run();
      }
      return result;
    } catch (cause) {
      if (this.connection.sqlite.inTransaction) this.connection.sqlite.prepare("ROLLBACK").run();
      return err({
        code: "APPLICATION_TRANSACTION_FAILED",
        message: "Transaction failed.",
        severity: "error",
        cause
      });
    }
  }
}

export class PersistedEventPublisher implements EventPublisher {
  public constructor(private readonly connection: DatabaseConnection) {}

  public publish(event: ApplicationEvent): Promise<CoreResult<void>> {
    try {
      const sourceId = this.extractEntityId(event);
      this.connection.sqlite
        .prepare(
          `INSERT INTO business_events (
            id, store_id, branch_id, event_name, source_type, source_id,
            payload_summary_json, occurred_at, created_at, created_by_user_id
          ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`
        )
        .run(
          event.id,
          String(event.metadata.storeId),
          event.name,
          event.name,
          sourceId,
          JSON.stringify(event.payload),
          event.occurredAt,
          new Date().toISOString(),
          typeof event.metadata.actorId === "string" ? event.metadata.actorId : null
        );
      return Promise.resolve(ok(undefined));
    } catch (cause) {
      return Promise.resolve(
        err({
          code: "APPLICATION_EVENT_PUBLISH_FAILED",
          message: "Failed to persist business event.",
          severity: "error",
          cause
        })
      );
    }
  }

  private extractEntityId(event: ApplicationEvent): string {
    const payload = event.payload as Readonly<Record<string, unknown>>;
    return typeof payload.entityId === "string" ? payload.entityId : event.id;
  }
}
