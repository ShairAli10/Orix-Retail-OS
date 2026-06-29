import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  createdAt,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey,
  requiredUuidColumn
} from "./shared.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const backups = sqliteTable(
  "backups",
  {
    id: uuidPrimaryKey(),
    storeId: requiredUuidColumn("store_id").references(() => stores.id),
    backupNumber: text("backup_number").notNull(),
    status: text("status").notNull().default("requested"),
    destinationType: text("destination_type").notNull(),
    fileName: text("file_name"),
    fileSizeBytes: integer("file_size_bytes", { mode: "number" }),
    checksum: text("checksum"),
    appVersion: text("app_version").notNull(),
    startedAt: timestampColumn("started_at"),
    completedAt: timestampColumn("completed_at"),
    verifiedAt: timestampColumn("verified_at"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    createdByUserId: uuidColumn("created_by_user_id").references(() => users.id),
    verifiedByUserId: uuidColumn("verified_by_user_id").references(() => users.id)
  },
  (table) => ({
    storeBackupNumberUnique: uniqueIndex("backups_store_number_unique").on(
      table.storeId,
      table.backupNumber
    ),
    checksumIdx: index("backups_checksum_idx").on(table.checksum),
    storeStatusIdx: index("backups_store_status_idx").on(table.storeId, table.status),
    completedAtIdx: index("backups_completed_at_idx").on(table.completedAt)
  })
);
