import { readFile } from "node:fs/promises";
import type { OspoQuantityRow, OspoStockLocation, OspoStoreProfile } from "./types.js";

type InsertRow = Readonly<Record<string, string | null>>;

export const parseOspoSqlFile = async (
  path: string
): Promise<{
  readonly store: OspoStoreProfile;
  readonly quantities: readonly OspoQuantityRow[];
  readonly stockLocations: readonly OspoStockLocation[];
}> => {
  const content = await readFile(path, "utf8");
  return {
    store: parseOspoStoreProfile(content),
    quantities: parseOspoQuantities(content),
    stockLocations: parseOspoStockLocations(content)
  };
};

export const parseOspoStoreProfile = (content: string): OspoStoreProfile => {
  const config = new Map<string, string>();
  for (const row of extractInsertRows(content, "ospos_app_config")) {
    const key = row.key;
    if (key !== undefined && key !== null) {
      config.set(key, row.value ?? "");
    }
  }
  return {
    company: clean(config.get("company")),
    address: clean(config.get("address")),
    phone: clean(config.get("phone")),
    email: clean(config.get("email")),
    currencyCode: clean(config.get("currency_code"))
  };
};

export const parseOspoQuantities = (content: string): readonly OspoQuantityRow[] =>
  extractInsertRows(content, "ospos_item_quantities").map((row) => ({
    itemId: requiredSqlValue(row, "item_id"),
    locationId: requiredSqlValue(row, "location_id"),
    quantity: decimal(row.quantity)
  }));

export const parseOspoStockLocations = (content: string): readonly OspoStockLocation[] =>
  extractInsertRows(content, "ospos_stock_locations").map((row) => ({
    locationId: requiredSqlValue(row, "location_id"),
    name: clean(row.location_name) ?? "stock",
    deleted: row.deleted === "1"
  }));

export const extractInsertRows = (content: string, tableName: string): readonly InsertRow[] => {
  const rows: InsertRow[] = [];
  const expression = new RegExp(
    `INSERT INTO \`${escapeRegExp(tableName)}\` \\(([^)]+)\\) VALUES\\s*([\\s\\S]*?);`,
    "g"
  );

  for (const match of content.matchAll(expression)) {
    const columnsText = match[1];
    const valuesText = match[2];
    if (columnsText === undefined || valuesText === undefined) {
      continue;
    }
    const columns = columnsText.split(",").map((column) => column.trim().replaceAll("`", ""));
    for (const tuple of parseSqlValueTuples(valuesText)) {
      const row: Record<string, string | null> = {};
      columns.forEach((column, index) => {
        row[column] = tuple[index] ?? null;
      });
      rows.push(row);
    }
  }

  return rows;
};

export const parseSqlValueTuples = (text: string): readonly (readonly (string | null)[])[] => {
  const tuples: (string | null)[][] = [];
  let tuple: (string | null)[] | null = null;
  let value = "";
  let inString = false;

  const pushValue = (): void => {
    if (tuple === null) {
      return;
    }
    const trimmed = value.trim();
    tuple.push(trimmed.toUpperCase() === "NULL" ? null : trimmed);
    value = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (tuple === null) {
      if (char === "(") {
        tuple = [];
        value = "";
      }
      continue;
    }

    if (inString) {
      if (char === "\\" && next !== undefined) {
        value += next;
        index += 1;
        continue;
      }
      if (char === "'" && next === "'") {
        value += "'";
        index += 1;
        continue;
      }
      if (char === "'") {
        inString = false;
        continue;
      }
      value += char ?? "";
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }
    if (char === ",") {
      pushValue();
      continue;
    }
    if (char === ")") {
      pushValue();
      tuples.push(tuple);
      tuple = null;
      continue;
    }
    value += char ?? "";
  }

  return tuples;
};

const requiredSqlValue = (row: InsertRow, key: string): string => {
  const value = clean(row[key]);
  if (value === null) {
    throw new Error(`OSPOS SQL row is missing required value: ${key}`);
  }
  return value;
};

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

const decimal = (value: string | null | undefined): number => {
  const normalized = clean(value);
  if (normalized === null) {
    return 0;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
