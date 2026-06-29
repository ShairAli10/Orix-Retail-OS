import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";
import type { Uuid } from "@orix/shared";

export const uuidPrimaryKey = () => text("id").$type<Uuid>().primaryKey().notNull();

export const uuidColumn = (name: string) => text(name).$type<Uuid>();

export const requiredUuidColumn = (name: string) => text(name).$type<Uuid>().notNull();

export const timestampColumn = (name: string) => text(name);

export const requiredTimestampColumn = (name: string) => text(name).notNull();

export const moneyColumn = (name: string) => integer(name, { mode: "number" });

export const requiredMoneyColumn = (name: string) => integer(name, { mode: "number" }).notNull();

export const quantityColumn = (name: string) => integer(name, { mode: "number" });

export const requiredQuantityColumn = (name: string) => integer(name, { mode: "number" }).notNull();

export const booleanColumn = (name: string) => integer(name, { mode: "boolean" });

export const requiredBooleanColumn = (name: string) => integer(name, { mode: "boolean" }).notNull();

export const createdAt = () => requiredTimestampColumn("created_at");

export const updatedAt = () => timestampColumn("updated_at");

export const archivedAt = () => timestampColumn("archived_at");

export const syncVersion = () => integer("sync_version", { mode: "number" }).notNull().default(1);

export const syncStatus = () => text("sync_status").notNull().default("local");

export const deviceId = () => text("device_id");

export const nonNegative = (columnName: string) => sql`${sql.identifier(columnName)} >= 0`;

export const positive = (columnName: string) => sql`${sql.identifier(columnName)} > 0`;

export const debitOrCredit = (debitColumnName: string, creditColumnName: string) =>
  sql`((${sql.identifier(debitColumnName)} > 0 AND ${sql.identifier(
    creditColumnName
  )} = 0) OR (${sql.identifier(debitColumnName)} = 0 AND ${sql.identifier(creditColumnName)} > 0))`;
