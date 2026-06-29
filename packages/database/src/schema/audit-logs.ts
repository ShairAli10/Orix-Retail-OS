import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { branches } from "./branches.js";
import { businessDays } from "./business-days.js";
import {
  createdAt,
  requiredTimestampColumn,
  requiredUuidColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    branchId: uuidColumn("branch_id").references(() => branches.id),
    businessDayId: uuidColumn("business_day_id").references(() => businessDays.id),
    actorUserId: uuidColumn("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuidColumn("target_id"),
    reason: text("reason"),
    metadataJson: text("metadata_json"),
    occurredAt: requiredTimestampColumn("occurred_at"),
    deviceId: text("device_id"),
    createdAt: createdAt()
  },
  (table) => ({
    actorOccurredIdx: index("audit_logs_actor_occurred_idx").on(
      table.actorUserId,
      table.occurredAt
    ),
    targetIdx: index("audit_logs_target_idx").on(table.targetType, table.targetId),
    actionOccurredIdx: index("audit_logs_action_occurred_idx").on(table.action, table.occurredAt),
    businessDayIdx: index("audit_logs_business_day_idx").on(table.businessDayId),
    occurredAtIdx: index("audit_logs_occurred_at_idx").on(table.occurredAt)
  })
);
