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

/** Read data statements only; never execute source SQL. */
export const extractInsertTables = (
  content: string,
  requested: readonly string[]
): ReadonlyMap<string, readonly InsertRow[]> => {
  const wanted = new Set(requested);
  const tables = new Map<string, InsertRow[]>();
  let start = 0;
  let quoted = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];
    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        start = i + 1;
      }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i += 1;
        start = i + 1;
      }
      continue;
    }
    if (quoted) {
      if (char === "\\") {
        i += 1;
        continue;
      }
      if (char === "'" && next === "'") {
        i += 1;
        continue;
      }
      if (char === "'") quoted = false;
      continue;
    }
    if (char === "'") {
      quoted = true;
      continue;
    }
    if ((char === "-" && next === "-") || char === "#") {
      lineComment = true;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (char !== ";") continue;
    const statement = content.slice(start, i).trim();
    start = i + 1;
    const table = /^INSERT\s+INTO\s+`([^`]+)`/i.exec(statement)?.[1];
    if (!table || !wanted.has(table)) continue;
    const match = /^INSERT\s+INTO\s+`[^`]+`\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+)$/i.exec(statement);
    if (!match?.[1] || !match[2]) throw new Error("Unsupported INSERT format in " + table);
    const columns = match[1].split(",").map((column) => column.trim().replaceAll("`", ""));
    const rows = tables.get(table) ?? [];
    for (const tuple of parseSqlValueTuples(match[2])) {
      if (tuple.length !== columns.length) throw new Error("Column count mismatch in " + table);
      rows.push(Object.fromEntries(columns.map((column, index) => [column, tuple[index] ?? null])));
    }
    tables.set(table, rows);
  }
  if (quoted || blockComment || /^\s*INSERT\s/i.test(content.slice(start)))
    throw new Error("SQL dump is incomplete.");
  return tables;
};

export const extractInsertRows = (content: string, tableName: string): readonly InsertRow[] =>
  extractInsertTables(content, [tableName]).get(tableName) ?? [];

export const parseSqlValueTuples = (text: string): readonly (readonly (string | null)[])[] => {
  const tuples: (string | null)[][] = [];
  let index = 0;
  const whitespace = () => {
    while (/\s/.test(text[index] ?? "") && index < text.length) index += 1;
  };
  while (index < text.length) {
    whitespace();
    if (index === text.length) break;
    if (text[index++] !== "(") throw new Error("Invalid SQL row.");
    const row: (string | null)[] = [];
    let rowClosed = false;
    while (index < text.length) {
      whitespace();
      if (text[index] === "'") {
        index += 1;
        let value = "";
        let closed = false;
        while (index < text.length) {
          const char = text[index++];
          if (char === "\\") {
            const escaped = text[index++];
            if (escaped === undefined) throw new Error("Incomplete SQL string.");
            const escapes: Record<string, string> = {
              n: "\n",
              r: "\r",
              t: "\t",
              "0": "\0",
              b: "\b",
              Z: "\x1a"
            };
            value += escapes[escaped] ?? escaped;
          } else if (char === "'") {
            if (text[index] === "'") {
              value += "'";
              index += 1;
            } else {
              closed = true;
              break;
            }
          } else value += char ?? "";
        }
        if (!closed) throw new Error("Incomplete SQL string.");
        row.push(value);
      } else {
        const start = index;
        while (index < text.length && text[index] !== "," && text[index] !== ")") index += 1;
        const value = text.slice(start, index).trim();
        if (/^NULL$/i.test(value)) row.push(null);
        else if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) row.push(value);
        else throw new Error("Unsupported SQL value.");
      }
      whitespace();
      const separator = text[index++];
      if (separator === ")") {
        tuples.push(row);
        rowClosed = true;
        break;
      }
      if (separator !== ",") throw new Error("Incomplete SQL row.");
    }
    if (!rowClosed) throw new Error("Incomplete SQL row.");
    whitespace();
    if (index < text.length) {
      if (text[index++] !== ",") throw new Error("Invalid SQL rows.");
      whitespace();
      if (index === text.length) throw new Error("Incomplete SQL rows.");
    }
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
