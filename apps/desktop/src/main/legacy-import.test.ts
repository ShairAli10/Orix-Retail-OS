import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDatabaseConnection, runMigrations, type DatabaseConnection } from "@orix/database";
import { createRepositories } from "@orix/repositories";
import type { LegacyStockImportPreviewDto, LegacyStockImportPayload } from "@orix/electron";
import { resetStoreData } from "./store-reset.js";
import { postLegacyImport } from "./legacy-import.js";
let connection: DatabaseConnection;
beforeEach(() => {
  connection = createDatabaseConnection({ filePath: ":memory:" });
  runMigrations(connection, { migrationsFolder: "packages/database/src/migrations" });
  connection.sqlite
    .exec(`INSERT INTO stores(id,name,currency_code,status,created_at) VALUES('store','Test','PKR','active','2026-10-01');
  INSERT INTO branches(id,store_id,name,code,status,is_default,created_at) VALUES('branch','store','Main','MAIN','active',1,'2026-10-01');
  INSERT INTO users(id,store_id,display_name,username,status,created_at) VALUES('owner','store','Owner','owner','active','2026-10-01');
  INSERT INTO business_days(id,store_id,branch_id,business_date,status,created_at,opened_by_user_id) VALUES('day','store','branch','2026-10-01','open','2026-10-01','owner');`);
});
afterEach(() => {
  connection.close();
});
const source = (): LegacyStockImportPreviewDto => ({
  sourceName: "test.sql",
  sourceHash: "a".repeat(64),
  sourceTimezone: "+00:00",
  storeTimezone: "Asia/Karachi",
  generatedAt: "2026-10-01",
  latestSaleAt: null,
  storeName: "Test",
  currency: "PKR",
  archivedProducts: 0,
  blockers: [],
  warnings: [],
  products: [
    {
      sourceItemId: "1",
      name: "Tea",
      categoryName: "Grocery",
      unitName: "Each",
      barcode: "123",
      purchasePriceMinor: 100,
      salePriceMinor: 150,
      minimumStock: 1,
      openingStock: 5,
      description: null,
      archived: false
    }
  ],
  contacts: [
    {
      sourceId: "2",
      kind: "supplier",
      name: "Supplier",
      phone: "",
      email: "",
      address: "",
      city: "Karachi"
    }
  ]
});
const payload = (s: LegacyStockImportPreviewDto): LegacyStockImportPayload => ({
  sourceHash: s.sourceHash,
  products: s.products,
  contacts: s.contacts,
  excluded: [],
  excludedContacts: [],
  acceptedWarnings: true
});
const backup = vi.fn(() =>
  Promise.resolve({
    status: "completed",
    verifiedAt: "2026-10-01",
    filePath: "test-backup.sqlite"
  })
);
const post = (s = source(), p = payload(s), makeBackup = backup) =>
  postLegacyImport(
    {
      connection,
      repositories: createRepositories(connection),
      storeId: "store",
      branchId: "branch",
      businessDayId: "day",
      userId: "owner"
    },
    s,
    p,
    makeBackup
  );
const count = (table: string) =>
  (connection.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
it("posts stock, contacts, mappings and report once, preserving retry results", async () => {
  backup.mockClear();
  const first = await post();
  expect(first).toMatchObject({
    createdProducts: 1,
    createdSuppliers: 1,
    openingQuantity: 5,
    openingCostMinor: 500
  });
  expect(await post()).toEqual(first);
  expect(backup).toHaveBeenCalledTimes(1);
  expect(count("products")).toBe(1);
  expect(count("inventory_transactions")).toBe(1);
  expect(count("legacy_import_records")).toBe(2);
  expect(count("ledger_entries")).toBe(0);
});
it("does not write imported records when backup or atomic event persistence fails", async () => {
  await expect(
    post(
      source(),
      payload(source()),
      vi.fn(() => Promise.reject(new Error("backup unavailable")))
    )
  ).rejects.toThrow();
  expect(count("products")).toBe(0);
  connection.sqlite.exec(
    "CREATE TRIGGER fail_event BEFORE INSERT ON business_events BEGIN SELECT RAISE(ABORT,'event failure'); END;"
  );
  await expect(post()).rejects.toThrow();
  for (const table of [
    "products",
    "categories",
    "units",
    "suppliers",
    "inventory_transactions",
    "legacy_import_jobs",
    "legacy_import_records"
  ])
    expect(count(table)).toBe(0);
});
it("rejects invalid corrections and prevents reimport from a changed dump", async () => {
  const s = source();
  const firstProduct = s.products[0];
  if (!firstProduct) throw new Error("Missing fixture");
  await expect(
    post(s, { ...payload(s), products: [{ ...firstProduct, openingStock: -2 }] })
  ).rejects.toThrow();
  await expect(post(s, { ...payload(s), sourceHash: "changed" })).rejects.toThrow();
  await post();
  const changed = { ...s, sourceHash: "b".repeat(64) };
  await expect(post(changed)).rejects.toThrow(/already imported/);
});
it("requires exclusion of unsupported source mappings even if renderer removes errors", async () => {
  const s = source();
  const firstProduct = s.products[0];
  if (!firstProduct) throw new Error("Missing fixture");
  const broken = { ...s, products: [{ ...firstProduct, sourceErrors: ["Unsupported pack"] }] };
  await expect(post(broken, payload(s))).rejects.toThrow(/Unsupported pack/);
  expect(count("products")).toBe(0);
});

it("rejects unverified backups, stale IDs and unacknowledged warnings", async () => {
  const s = source();
  await expect(post(s, { ...payload(s), acceptedWarnings: false })).rejects.toThrow(/Confirm/);
  await expect(post(s, { ...payload(s), excluded: ["unknown"] })).rejects.toThrow(/match/);
  await expect(
    post(
      s,
      payload(s),
      vi.fn(() => Promise.resolve({ status: "failed", verifiedAt: "", filePath: "" }))
    )
  ).rejects.toThrow(/verified backup/);
  expect(count("products")).toBe(0);
});
it("can exclude an unsupported product while importing contacts with zero debt", async () => {
  const s = source();
  const first = s.products[0];
  if (!first) throw new Error("Missing fixture");
  const review = { ...s, products: [{ ...first, sourceErrors: ["Unsupported pack"] }] };
  const result = await post(review, { ...payload(review), excluded: ["1"] });
  expect(result.createdProducts).toBe(0);
  expect(result.createdSuppliers).toBe(1);
  expect(count("ledger_entries")).toBe(0);
});
it("rolls back if persisted stock value fails reconciliation", async () => {
  connection.sqlite.exec(
    "CREATE TRIGGER corrupt_cost AFTER INSERT ON inventory_transactions BEGIN UPDATE inventory_transactions SET unit_cost_minor=0 WHERE id=NEW.id; END;"
  );
  await expect(post()).rejects.toThrow(/reconciliation/);
  expect(count("products")).toBe(0);
  expect(count("inventory_transactions")).toBe(0);
});

it("reset preserves login, keeps a backup reference and allows the same source to be imported afresh", async () => {
  await post();
  await expect(resetStoreData(connection, "store", "owner", "wrong", backup)).rejects.toThrow(
    /Type/
  );
  await expect(
    resetStoreData(connection, "store", "owner", "RESET STORE DATA", () =>
      Promise.reject(new Error("disk unavailable"))
    )
  ).rejects.toThrow();
  expect(count("products")).toBe(1);
  await resetStoreData(connection, "store", "owner", "RESET STORE DATA", backup);
  expect(count("products")).toBe(0);
  expect(count("legacy_import_jobs")).toBe(0);
  expect(count("users")).toBe(1);
  expect(count("stores")).toBe(1);
  expect(connection.sqlite.pragma("foreign_key_check")).toEqual([]);
  await post();
  expect(count("products")).toBe(1);
});
it("reset deletion failure rolls back all data", async () => {
  await post();
  connection.sqlite.exec(
    "CREATE TRIGGER prevent_reset BEFORE DELETE ON products BEGIN SELECT RAISE(ABORT,'blocked'); END;"
  );
  await expect(
    resetStoreData(connection, "store", "owner", "RESET STORE DATA", backup)
  ).rejects.toThrow();
  expect(count("legacy_import_jobs")).toBe(1);
  expect(count("inventory_transactions")).toBe(1);
});
