import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";
import { join } from "node:path";
import {
  branches,
  createDatabaseConnection,
  products,
  runMigrations,
  stores,
  units,
  users,
  type DatabaseConnection
} from "@orix/database";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CustomerRepository } from "./customers/customer-repository.js";
import { ProductRepository } from "./products/product-repository.js";
import { createRepositories } from "./shared/repository-factory.js";

type Seed = {
  readonly storeId: typeof stores.$inferInsert.id;
  readonly branchId: typeof branches.$inferInsert.id;
  readonly userId: typeof users.$inferInsert.id;
  readonly unitId: typeof units.$inferInsert.id;
};

const uuid = () => randomUUID() as typeof stores.$inferInsert.id;

const now = () => new Date().toISOString();

const createTestConnection = (): DatabaseConnection => {
  const filePath = join(tmpdir(), `orix-repositories-${randomUUID()}.sqlite`);
  const connection = createDatabaseConnection({ filePath });
  runMigrations(connection, { migrationsFolder: "packages/database/src/migrations" });
  return connection;
};

const destroyTestConnection = (connection: DatabaseConnection | undefined): void => {
  if (connection === undefined) {
    return;
  }

  const filePath = connection.sqlite.name;
  connection.close();
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(`${filePath}${suffix}`, { force: true });
  }
};

const requireConnection = (connection: DatabaseConnection | undefined): DatabaseConnection => {
  if (connection === undefined) {
    throw new Error("Expected repository test database connection to be initialized");
  }

  return connection;
};

const seedFoundation = (connection: DatabaseConnection): Seed => {
  const timestamp = now();
  const storeId = uuid();
  const branchId = uuid();
  const userId = uuid();
  const unitId = uuid();

  connection.drizzle
    .insert(stores)
    .values({
      id: storeId,
      name: "Orix Test Store",
      currencyCode: "PKR",
      status: "active",
      createdAt: timestamp
    })
    .run();

  connection.drizzle
    .insert(branches)
    .values({
      id: branchId,
      storeId,
      name: "Main Branch",
      code: "MAIN",
      status: "active",
      isDefault: true,
      createdAt: timestamp
    })
    .run();

  connection.drizzle
    .insert(users)
    .values({
      id: userId,
      storeId,
      displayName: "Test User",
      username: "test-user",
      status: "active",
      createdAt: timestamp
    })
    .run();

  connection.drizzle
    .insert(units)
    .values({
      id: unitId,
      storeId,
      name: "Piece",
      abbreviation: "pc",
      status: "active",
      createdAt: timestamp
    })
    .run();

  return { storeId, branchId, userId, unitId };
};

describe("repositories", () => {
  let connection: DatabaseConnection | undefined;
  let seed: Seed;

  beforeEach(() => {
    connection = createTestConnection();
    seed = seedFoundation(connection);
  });

  afterEach(() => {
    destroyTestConnection(connection);
    connection = undefined;
  });

  it("persists and reads records through typed result values", async () => {
    const activeConnection = requireConnection(connection);
    const repository = new CustomerRepository(activeConnection);
    const createdAt = now();
    const customerId = uuid();

    const created = await repository.create({
      id: customerId,
      storeId: seed.storeId,
      name: "Ali Customer",
      phone: "03000000001",
      status: "active",
      creditAllowed: false,
      createdAt
    });

    expect(created.ok).toBe(true);

    const found = await repository.findById(customerId);

    expect(found.ok).toBe(true);
    expect(found.ok ? found.value?.name : undefined).toBe("Ali Customer");
  });

  it("supports pagination, filtering, search, and store-aware queries", async () => {
    const activeConnection = requireConnection(connection);
    const repository = new CustomerRepository(activeConnection);
    const timestamp = now();

    const first = await repository.create({
      id: uuid(),
      storeId: seed.storeId,
      name: "Alpha Retail",
      phone: "03000000002",
      status: "active",
      creditAllowed: false,
      createdAt: timestamp
    });
    const second = await repository.create({
      id: uuid(),
      storeId: seed.storeId,
      name: "Beta Wholesale",
      phone: "03000000003",
      status: "active",
      creditAllowed: false,
      createdAt: timestamp
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const page = await repository.findByStore(seed.storeId, { page: 1, pageSize: 1 });
    const search = await repository.search(
      "Beta",
      { page: 1, pageSize: 10 },
      { storeId: seed.storeId }
    );

    expect(page.ok ? page.value.totalItems : 0).toBe(2);
    expect(page.ok ? page.value.items.length : 0).toBe(1);
    expect(search.ok ? search.value.items[0]?.name : undefined).toBe("Beta Wholesale");
  });

  it("soft deletes, restores, and enforces optimistic concurrency", async () => {
    const activeConnection = requireConnection(connection);
    const repository = new CustomerRepository(activeConnection);
    const customerId = uuid();
    const createdAt = now();
    const updatedAt = now();

    const created = await repository.create({
      id: customerId,
      storeId: seed.storeId,
      name: "Soft Delete Customer",
      phone: "03000000004",
      status: "active",
      creditAllowed: false,
      createdAt,
      updatedAt
    });

    expect(created.ok).toBe(true);

    const conflict = await repository.update(
      customerId,
      { name: "Should Not Apply" },
      { expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }
    );
    expect(conflict.ok).toBe(false);

    const archivedAt = now();
    const deleted = await repository.softDelete(customerId, { timestamp: archivedAt });
    const activePage = await repository.findPage(
      { page: 1, pageSize: 10 },
      { storeId: seed.storeId }
    );
    const archivedPage = await repository.findPage(
      { page: 1, pageSize: 10 },
      { storeId: seed.storeId, archived: "archived" }
    );
    const restored = await repository.restore(customerId, { timestamp: now() });

    expect(deleted.ok).toBe(true);
    expect(activePage.ok ? activePage.value.totalItems : 1).toBe(0);
    expect(archivedPage.ok ? archivedPage.value.totalItems : 0).toBe(1);
    expect(restored.ok).toBe(true);
  });

  it("supports document lookup and repository factory smoke paths", async () => {
    const activeConnection = requireConnection(connection);
    const repositories = createRepositories(activeConnection);
    const productRepository = new ProductRepository(activeConnection);
    const timestamp = now();
    const productId = uuid();

    const product = await productRepository.create({
      id: productId,
      storeId: seed.storeId,
      unitId: seed.unitId,
      sku: "SKU-001",
      barcode: "1234567890123",
      name: "Repository Product",
      productType: "standard",
      status: "active",
      isStockTracked: true,
      isSellable: true,
      isPurchasable: true,
      createdAt: timestamp
    });

    expect(product.ok).toBe(true);

    const foundProduct = await repositories.products.findMany({
      storeId: seed.storeId,
      search: "SKU-001"
    });
    const missingSale = await repositories.sales.findByDocumentNumber("SALE-DOES-NOT-EXIST", {
      branchId: seed.branchId
    });

    expect(foundProduct.ok ? foundProduct.value[0]?.id : undefined).toBe(productId);
    expect(missingSale.ok ? missingSale.value : undefined).toBeUndefined();

    const productRows = activeConnection.drizzle.select().from(products).all();
    expect(productRows).toHaveLength(1);
  });
});
