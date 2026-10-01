import { createHash } from "node:crypto";
import { extractInsertTables } from "./sql.js";
import type { SqlImportReview, SqlContactCandidate } from "./types.js";

type Row = Readonly<Record<string, string | null>>;
const text = (row: Row, key: string): string => row[key]?.trim() ?? "";
const number = (row: Row, key: string): number => {
  const value = text(row, key);
  if (!value || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value)))
    throw new Error(`Invalid ${key} for source item ${text(row, "item_id")}.`);
  return Number(value);
};

export const createSqlReview = (content: string, sourceName: string): SqlImportReview => {
  const tables = extractInsertTables(content, [
    "ospos_app_config",
    "ospos_items",
    "ospos_item_quantities",
    "ospos_stock_locations",
    "ospos_people",
    "ospos_customers",
    "ospos_suppliers",
    "ospos_sales"
  ]);
  const rows = (name: string) => tables.get(name) ?? [];
  const items = rows("ospos_items");
  if (items.length === 0)
    throw new Error(
      "No supported OSPOS products were found. Choose an OSPOS SQL export with INSERT rows and column names."
    );
  const config = new Map(
    rows("ospos_app_config").map((row) => [text(row, "key"), text(row, "value")])
  );
  const blockers: string[] = [];
  const repeatedStock = new Set<string>();
  const quantities = new Map<string, number>();
  const locations = rows("ospos_stock_locations").filter((row) => row.deleted !== "1");
  const quantityLocations = new Set(rows("ospos_item_quantities").map((row) => row.location_id));
  if (
    locations.length !== 1 ||
    quantityLocations.size !== 1 ||
    !quantityLocations.has(locations[0]?.location_id)
  )
    blockers.push(
      "Stock location needs review. This importer requires one matching active stock location; it will not combine locations automatically."
    );
  for (const row of rows("ospos_item_quantities")) {
    const id = text(row, "item_id");
    if (quantities.has(id)) repeatedStock.add(id);
    quantities.set(id, number(row, "quantity"));
  }
  const ids = new Set<string>();
  const products = items
    .filter((row) => row.deleted !== "1")
    .map((row) => {
      const id = text(row, "item_id");
      if (!id || ids.has(id)) throw new Error("Missing or repeated source product ID.");
      ids.add(id);
      const sourceErrors: string[] = [];
      if (repeatedStock.has(id))
        sourceErrors.push(
          "Repeated stock record: exclude this item until the source is corrected."
        );
      if (!quantities.has(id)) sourceErrors.push(`Source item ${id} has no stock record.`);
      if (row.stock_type && row.stock_type !== "0")
        sourceErrors.push(`Source item ${id} is a non-stock product and needs a separate mapping.`);
      if (row.qty_per_pack && number(row, "qty_per_pack") !== 1)
        sourceErrors.push(`Source item ${id} uses pack conversion and needs review.`);
      return {
        sourceItemId: id,
        sourceErrors,
        name: text(row, "name"),
        categoryName: text(row, "category") || "Uncategorized",
        unitName: text(row, "pack_name") || "Each",
        barcode: text(row, "item_number") || null,
        purchasePriceMinor: Math.round(number(row, "cost_price") * 100),
        salePriceMinor: Math.round(number(row, "unit_price") * 100),
        minimumStock: number(row, "reorder_level"),
        openingStock: quantities.get(id) ?? 0,
        description: text(row, "description") || null,
        archived: false
      };
    });
  const people = new Map(rows("ospos_people").map((row) => [text(row, "person_id"), row]));
  const contacts: SqlContactCandidate[] = [];
  for (const kind of ["customer", "supplier"] as const) {
    for (const row of rows(`ospos_${kind}s`).filter((row) => row.deleted !== "1")) {
      const id = text(row, "person_id");
      const person = people.get(id);
      if (!person) {
        blockers.push(`Missing contact details for ${kind} ${id}.`);
        continue;
      }
      contacts.push({
        sourceId: id,
        kind,
        name:
          text(row, "company_name") ||
          [text(person, "first_name"), text(person, "last_name")].filter(Boolean).join(" "),
        phone: text(person, "phone_number"),
        email: text(person, "email"),
        address: [text(person, "address_1"), text(person, "address_2")].filter(Boolean).join(", "),
        city: text(person, "city")
      });
    }
  }
  const sourceTimezone =
    /^SET\s+time_zone\s*=\s*["']([+-]\d{2}:\d{2})["']/im.exec(content)?.[1] ?? null;
  const latest = rows("ospos_sales")
    .map((row) => text(row, "sale_time"))
    .sort()
    .at(-1);
  let latestSaleAt: string | null = null;
  if (latest && sourceTimezone) {
    const date = new Date(`${latest.replace(" ", "T")}${sourceTimezone}`);
    if (Number.isFinite(date.getTime())) latestSaleAt = date.toISOString();
  }
  const currency = config.get("currency_code") ?? null;
  if (currency !== "PKR")
    blockers.push("Confirm the source currency before converting prices to PKR.");
  return {
    sourceName,
    sourceHash: createHash("sha256").update(content).digest("hex"),
    sourceTimezone,
    storeTimezone: config.get("timezone") ?? "Asia/Karachi",
    generatedAt: new Date().toISOString(),
    latestSaleAt,
    storeName: config.get("company") ?? "Previous store",
    currency,
    archivedProducts: items.length - products.length,
    products,
    contacts,
    blockers,
    warnings: [
      "This preview covers products, opening stock and contacts. Historical transactions and outstanding balances are not imported in this stage.",
      ...(sourceTimezone
        ? []
        : [
            "The dump does not declare a supported time offset. Historical dates need review before importing history."
          ])
    ]
  };
};
