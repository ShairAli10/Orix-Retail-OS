import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditLogs } from "./audit-logs.js";
import { branches } from "./branches.js";
import {
  createdAt,
  deviceId,
  requiredTimestampColumn,
  requiredUuidColumn,
  syncStatus,
  syncVersion,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const businessEvents = sqliteTable(
  "business_events",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: uuidColumn("branch_id").references(() => branches.id),
    eventName: text("event_name").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: requiredUuidColumn("source_id"),
    payloadSummaryJson: text("payload_summary_json"),
    occurredAt: requiredTimestampColumn("occurred_at"),
    createdAt: createdAt(),
    createdByUserId: uuidColumn("created_by_user_id").references(() => users.id),
    auditLogId: uuidColumn("audit_log_id").references(() => auditLogs.id),
    syncStatus: syncStatus(),
    syncVersion: syncVersion(),
    deviceId: deviceId()
  },
  (table) => ({
    sourceEventIdx: index("business_events_source_event_idx").on(
      table.sourceType,
      table.sourceId,
      table.eventName
    ),
    eventOccurredIdx: index("business_events_event_occurred_idx").on(
      table.eventName,
      table.occurredAt
    ),
    sourceIdx: index("business_events_source_idx").on(table.sourceType, table.sourceId),
    syncStatusOccurredIdx: index("business_events_sync_status_occurred_idx").on(
      table.syncStatus,
      table.occurredAt
    ),
    occurredAtIdx: index("business_events_occurred_at_idx").on(table.occurredAt)
  })
);
