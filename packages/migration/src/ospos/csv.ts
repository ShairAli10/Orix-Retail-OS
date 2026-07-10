import { readFile } from "node:fs/promises";
import type { OspoItemRow } from "./types.js";

const nullishText = new Set(["", "NULL", "null"]);

export const parseOspoItemsCsvFile = async (path: string): Promise<readonly OspoItemRow[]> => {
  const content = await readFile(path, "utf8");
  return parseOspoItemsCsv(content);
};

export const parseOspoItemsCsv = (content: string): readonly OspoItemRow[] => {
  const records = parseCsv(content);
  const [headers, ...rows] = records;
  if (headers === undefined) {
    return [];
  }

  return rows
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row) => toOspoItemRow(toRecord(headers, row)));
};

export const parseCsv = (content: string): readonly (readonly string[])[] => {
  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      records.push(row);
      row = [];
      value = "";
      continue;
    }
    value += char ?? "";
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    records.push(row);
  }

  return records;
};

const toRecord = (
  headers: readonly string[],
  row: readonly string[]
): Readonly<Record<string, string>> => {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });
  return record;
};

const toOspoItemRow = (record: Readonly<Record<string, string>>): OspoItemRow => ({
  itemId: requiredText(record, "item_id"),
  name: requiredText(record, "name"),
  category: optionalText(record.category),
  barcode: optionalText(record.item_number),
  description: optionalText(record.description),
  costPrice: decimal(record.cost_price),
  salePrice: decimal(record.unit_price),
  reorderLevel: decimal(record.reorder_level),
  receivingQuantity: decimal(record.receiving_quantity),
  deleted: record.deleted === "1",
  packName: optionalText(record.pack_name)
});

const requiredText = (record: Readonly<Record<string, string>>, key: string): string => {
  const value = optionalText(record[key]);
  if (value === null) {
    throw new Error(`OSPOS item CSV is missing required column value: ${key}`);
  }
  return value;
};

const optionalText = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return nullishText.has(trimmed) ? null : trimmed;
};

const decimal = (value: string | undefined): number => {
  const normalized = optionalText(value);
  if (normalized === null) {
    return 0;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
