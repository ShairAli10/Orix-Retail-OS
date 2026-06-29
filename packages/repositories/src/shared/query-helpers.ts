import { and, asc, desc, eq, gte, like, lte, sql, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { PageRequest, SortOrder } from "@orix/core";
import type { ArchiveVisibility, DateRangeFilter } from "./filters.js";

export type SortableColumns<T> = Partial<Record<keyof T, AnySQLiteColumn>>;

export const combineConditions = (conditions: readonly (SQL | undefined)[]): SQL | undefined => {
  const defined = conditions.filter((condition): condition is SQL => condition !== undefined);
  return defined.length === 0 ? undefined : and(...defined);
};

export const equalsIfPresent = (
  column: AnySQLiteColumn | undefined,
  value: string | number | boolean | undefined
): SQL | undefined => (column !== undefined && value !== undefined ? eq(column, value) : undefined);

export const dateRangeCondition = (
  column: AnySQLiteColumn | undefined,
  range: DateRangeFilter | undefined
): SQL | undefined =>
  combineConditions([
    column !== undefined && range?.from !== undefined ? gte(column, range.from) : undefined,
    column !== undefined && range?.to !== undefined ? lte(column, range.to) : undefined
  ]);

export const archiveCondition = (
  archivedAtColumn: AnySQLiteColumn | undefined,
  visibility: ArchiveVisibility | undefined
): SQL | undefined => {
  if (archivedAtColumn === undefined || visibility === undefined || visibility === "all") {
    return undefined;
  }

  return visibility === "archived"
    ? sql`${archivedAtColumn} IS NOT NULL`
    : sql`${archivedAtColumn} IS NULL`;
};

export const textSearchCondition = (
  columns: readonly AnySQLiteColumn[],
  search: string | undefined
): SQL | undefined => {
  if (search === undefined || search.trim().length === 0 || columns.length === 0) {
    return undefined;
  }

  const pattern = `%${search.trim()}%`;
  return sql.join(
    columns.map((column) => like(column, pattern)),
    sql` OR `
  );
};

export const documentSearchCondition = (
  column: AnySQLiteColumn | undefined,
  documentNumber: string | undefined
): SQL | undefined =>
  column !== undefined && documentNumber !== undefined ? eq(column, documentNumber) : undefined;

export const orderByFor = <T>(
  request: PageRequest<T>,
  sortableColumns: SortableColumns<T>
): SQL[] => {
  const sort = request.sort ?? [];
  return sort.flatMap((order: SortOrder<T>) => {
    const column = sortableColumns[order.field];
    if (column === undefined) {
      return [];
    }

    return [order.direction === "asc" ? asc(column) : desc(column)];
  });
};
