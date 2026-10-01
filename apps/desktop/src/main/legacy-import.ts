import { randomUUID } from "node:crypto";
import type { CoreResult } from "@orix/core";
import type { DatabaseConnection } from "@orix/database";
import type { RepositoryFactory } from "@orix/repositories";
import type {
  LegacyStockImportPayload,
  LegacyStockImportPreviewDto,
  LegacyStockImportResultDto
} from "@orix/electron";
import { reviewProducts } from "@orix/migration/review";

type Context = {
  connection: DatabaseConnection;
  repositories: RepositoryFactory;
  storeId: string;
  branchId: string;
  businessDayId: string;
  userId: string;
};
export class ImportReviewError extends Error {}
const requireResult = <T>(result: CoreResult<T>): T => {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};
const check = (valid: boolean, message: string): void => {
  if (!valid) throw new ImportReviewError(message);
};
const text = (value: unknown, required = false): boolean =>
  typeof value === "string" && value.length <= 2000 && (!required || value.trim().length > 0);
const sameIds = (
  original: readonly string[],
  edited: readonly string[],
  excluded: readonly string[]
): boolean =>
  new Set(original).size === original.length &&
  new Set(edited).size === edited.length &&
  original.length === edited.length &&
  edited.every((id) => original.includes(id)) &&
  new Set(excluded).size === excluded.length &&
  excluded.every((id) => original.includes(id));

export const lastLegacyImport = (
  context: Pick<Context, "connection" | "storeId">
): LegacyStockImportResultDto | null => {
  const row = context.connection.sqlite
    .prepare(
      "SELECT result_json FROM legacy_import_jobs WHERE store_id = ? ORDER BY imported_at DESC LIMIT 1"
    )
    .get(context.storeId) as { result_json: string } | undefined;
  return row ? (JSON.parse(row.result_json) as LegacyStockImportResultDto) : null;
};

export const postLegacyImport = async (
  context: Context,
  source: LegacyStockImportPreviewDto,
  input: LegacyStockImportPayload,
  createBackup: () => Promise<{
    status: string;
    verifiedAt: string | null;
    filePath: string | null;
  }>
): Promise<LegacyStockImportResultDto> => {
  const { connection, repositories, storeId, branchId, businessDayId, userId } = context;
  const db = connection.sqlite;
  check(
    input.sourceHash === source.sourceHash,
    "The SQL file changed. Choose it again and review the new data."
  );
  const previous = db
    .prepare("SELECT result_json FROM legacy_import_jobs WHERE store_id=? AND source_hash=?")
    .get(storeId, source.sourceHash) as { result_json: string } | undefined;
  if (previous) return JSON.parse(previous.result_json) as LegacyStockImportResultDto;
  check(source.blockers.length === 0, source.blockers.join(" "));
  check(
    Array.isArray(input.products) &&
      Array.isArray(input.contacts) &&
      Array.isArray(input.excluded) &&
      Array.isArray(input.excludedContacts),
    "Invalid review. Choose the SQL file again."
  );
  const contactKey = (row: { kind: string; sourceId: string }) => `${row.kind}:${row.sourceId}`;
  check(
    sameIds(
      source.products.map((p) => p.sourceItemId),
      input.products.map((p) => p.sourceItemId),
      input.excluded
    ) &&
      sameIds(
        source.contacts.map(contactKey),
        input.contacts.map(contactKey),
        input.excludedContacts
      ),
    "Review rows do not match the source. Choose the SQL file again."
  );
  const products = input.products
    .filter((p) => !input.excluded.includes(p.sourceItemId))
    .map((row) => {
      check(
        [row.name, row.categoryName, row.unitName].every((v) => text(v, true)) &&
          (row.barcode === null || text(row.barcode)) &&
          (row.description === null || text(row.description)) &&
          typeof row.archived === "boolean" &&
          !row.archived,
        "Check product names, categories, units and descriptions."
      );
      return {
        ...row,
        name: row.name.trim(),
        categoryName: row.categoryName.trim(),
        unitName: row.unitName.trim(),
        barcode: row.barcode?.trim() ? row.barcode.trim() : null,
        sourceErrors:
          source.products.find((p) => p.sourceItemId === row.sourceItemId)?.sourceErrors ?? []
      };
    });
  const reviews = reviewProducts(products, []);
  for (const row of products)
    check(
      !reviews.get(row.sourceItemId)?.errors.length,
      `${row.name}: ${reviews.get(row.sourceItemId)?.errors.join(" ") ?? ""}`
    );
  check(
    typeof input.acceptedWarnings === "boolean" && input.acceptedWarnings,
    "Confirm the warnings, opening quantities and excluded history before importing."
  );
  const contacts = input.contacts.filter((c) => !input.excludedContacts.includes(contactKey(c)));
  check(products.length + contacts.length > 0, "Select at least one product or contact.");
  const totalCost = products.reduce(
    (sum, p) => sum + Math.round(p.openingStock * p.purchasePriceMinor),
    0
  );
  check(
    Number.isSafeInteger(totalCost) &&
      products.every((p) => Number.isSafeInteger(Math.round(p.openingStock * 1000000))),
    "Opening quantities or stock value are too large."
  );
  const seenNames = new Set<string>();
  const seenPhones = new Set<string>();
  for (const row of contacts) {
    check(
      text(row.name, true) && [row.phone, row.email, row.address, row.city].every((v) => text(v)),
      "Check the included contact details."
    );
    const nameKey = `${row.kind}:${row.name.trim().toLowerCase()}`;
    check(
      !seenNames.has(nameKey),
      `${row.name}: another included contact has the same name. Rename or exclude it.`
    );
    seenNames.add(nameKey);
    if (row.phone.trim()) {
      const key = `${row.kind}:${row.phone.trim()}`;
      check(!seenPhones.has(key), `${row.name}: phone is repeated in another included contact.`);
      seenPhones.add(key);
    }
  }
  const validateExisting = () => {
    for (const row of [
      ...products.map((p) => ({ kind: "product", sourceId: p.sourceItemId })),
      ...contacts
    ]) {
      check(
        !db
          .prepare(
            "SELECT 1 FROM legacy_import_records WHERE store_id=? AND kind=? AND source_id=?"
          )
          .get(storeId, row.kind, row.sourceId),
        "Some source records were already imported. Exclude those rows before importing another export."
      );
    }
    for (const row of products)
      check(
        !row.barcode ||
          !db
            .prepare("SELECT 1 FROM products WHERE store_id=? AND barcode=?")
            .get(storeId, row.barcode),
        `${row.name}: barcode already exists in Orix. Exclude this row or correct its barcode.`
      );
    for (const row of contacts) {
      const table = row.kind === "customer" ? "customers" : "suppliers";
      check(
        !db
          .prepare(
            `SELECT 1 FROM ${table} WHERE store_id=? AND (lower(trim(name))=lower(?) OR (?<>'' AND phone=?))`
          )
          .get(storeId, row.name.trim(), row.phone.trim(), row.phone.trim()),
        `${row.name}: a contact with this name or phone already exists. Exclude it to avoid duplication.`
      );
    }
  };
  validateExisting();
  const backup = await createBackup();
  check(
    backup.status === "completed" && !!backup.verifiedAt && !!backup.filePath,
    "A verified backup is required. Nothing was imported."
  );
  return db.transaction(() => {
    validateExisting();
    const importedAt = new Date().toISOString();
    const id = randomUUID();
    const catalog = requireResult(repositories.productManagement.getCatalog(storeId, true));
    const categories = new Map(catalog.categories.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const units = new Map(catalog.units.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const catalogId = (kind: "category" | "unit", name: string): string => {
      const map = kind === "category" ? categories : units;
      const key = name.toLowerCase();
      let target = map.get(key);
      if (!target) {
        target = requireResult(
          repositories.productManagement.createCatalogItem(kind, {
            storeId,
            name,
            userId,
            timestamp: importedAt
          })
        ).id;
        map.set(key, target);
      }
      return target;
    };
    const mappings: { kind: string; sourceId: string; targetId: string }[] = [];
    for (const row of products) {
      const write = {
        storeId,
        userId,
        timestamp: importedAt,
        categoryId: catalogId("category", row.categoryName),
        unitId: catalogId("unit", row.unitName),
        brandId: null,
        name: row.name,
        barcode: row.barcode,
        description: row.description,
        purchasePriceMinor: row.purchasePriceMinor,
        salePriceMinor: row.salePriceMinor,
        minimumStock: row.minimumStock,
        active: true
      };
      const product = requireResult(repositories.productManagement.createProduct(write));
      requireResult(
        repositories.productManagement.createOpeningStock(
          product.id,
          write,
          row.openingStock,
          branchId,
          businessDayId
        )
      );
      const actual = db
        .prepare(
          "SELECT coalesce(sum(quantity),0) AS quantity, coalesce(sum(quantity*unit_cost_minor),0) AS cost FROM inventory_transactions WHERE product_id=? AND status='posted'"
        )
        .get(product.id) as { quantity: number; cost: number };
      if (
        actual.quantity !== row.openingStock ||
        Math.round(actual.cost) !== Math.round(row.openingStock * row.purchasePriceMinor)
      )
        throw new Error("Opening stock reconciliation failed.");
      mappings.push({ kind: "product", sourceId: row.sourceItemId, targetId: product.id });
    }
    for (const row of contacts) {
      const write = {
        storeId,
        branchId,
        businessDayId,
        userId,
        name: row.name.trim(),
        phone: row.phone.trim() || null,
        email: row.email.trim() || null,
        address: row.address.trim() || null,
        city: row.city.trim() || null,
        tags: [],
        openingBalanceMinor: 0
      };
      const contact =
        row.kind === "customer"
          ? requireResult(
              repositories.customers.createCustomer({
                ...write,
                customerType: "regular",
                creditLimitMinor: 0
              })
            )
          : requireResult(repositories.suppliers.createSupplier(write));
      mappings.push({ kind: row.kind, sourceId: row.sourceId, targetId: contact.id });
    }
    const summary = {
      id,
      importedAt,
      sourceName: source.sourceName,
      sourceHash: source.sourceHash,
      backupFile: backup.filePath ?? "",
      createdProducts: products.length,
      createdCustomers: contacts.filter((c) => c.kind === "customer").length,
      createdSuppliers: contacts.filter((c) => c.kind === "supplier").length,
      openingStockTransactions: products.filter((p) => p.openingStock > 0).length,
      openingQuantity: products.reduce((sum, p) => sum + p.openingStock, 0),
      openingCostMinor: totalCost
    };
    const result: LegacyStockImportResultDto = {
      ...summary,
      reportJson: JSON.stringify(
        {
          version: 1,
          ...summary,
          actor: userId,
          mappings,
          originals: { products: source.products, contacts: source.contacts },
          reviewed: input,
          historyImported: false,
          openingContactBalances: 0
        },
        null,
        2
      )
    };
    db.prepare(
      "INSERT INTO legacy_import_jobs(id,store_id,source_hash,result_json,imported_at) VALUES(?,?,?,?,?)"
    ).run(id, storeId, source.sourceHash, JSON.stringify(result), importedAt);
    const insert = db.prepare(
      "INSERT INTO legacy_import_records(store_id,kind,source_id,target_id,job_id) VALUES(?,?,?,?,?)"
    );
    for (const row of mappings) insert.run(storeId, row.kind, row.sourceId, row.targetId, id);
    db.prepare(
      "INSERT INTO business_events(id,store_id,branch_id,event_name,source_type,source_id,payload_summary_json,occurred_at,created_at,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)"
    ).run(
      randomUUID(),
      storeId,
      branchId,
      "LegacyImportCompleted",
      "legacy-import",
      id,
      JSON.stringify(summary),
      importedAt,
      importedAt,
      userId
    );
    return result;
  })();
};
