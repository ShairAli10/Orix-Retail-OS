import { inventoryTransactions } from "@orix/database";
import type { CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import { BaseRepository } from "../shared/base-repository.js";
import { repositoryError } from "../shared/repository-error.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export type InventoryStatusFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

export type InventoryListQuery = {
  readonly storeId: string;
  readonly search?: string;
  readonly status?: InventoryStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy:
    | "barcode"
    | "sku"
    | "product"
    | "category"
    | "currentStock"
    | "minimumStock"
    | "purchasePrice"
    | "retailPrice"
    | "inventoryValue"
    | "status";
  readonly sortDirection: "asc" | "desc";
};

export type InventoryItem = {
  readonly productId: string;
  readonly barcode: string | null;
  readonly sku: string | null;
  readonly productName: string;
  readonly categoryName: string | null;
  readonly supplierName: string | null;
  readonly currentStock: number;
  readonly reservedStock: number;
  readonly availableStock: number;
  readonly minimumStock: number;
  readonly maximumStock: number | null;
  readonly purchasePriceMinor: number;
  readonly retailPriceMinor: number;
  readonly inventoryValuePurchaseMinor: number;
  readonly inventoryValueRetailMinor: number;
  readonly status: "in-stock" | "low-stock" | "out-of-stock";
};

export type InventoryPage = {
  readonly items: readonly InventoryItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type InventoryMovement = {
  readonly id: string;
  readonly date: string;
  readonly productId: string;
  readonly productName: string;
  readonly reason: string;
  readonly direction: "in" | "out";
  readonly quantity: number;
  readonly beforeQuantity: number;
  readonly afterQuantity: number;
  readonly userName: string;
  readonly reference: string;
  readonly notes: string | null;
  readonly unitCostMinor: number | null;
};

export type InventoryMovementQuery = {
  readonly storeId: string;
  readonly productId?: string;
  readonly reason?: string;
  readonly userId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page: number;
  readonly pageSize: number;
};

export type InventoryMovementPage = {
  readonly items: readonly InventoryMovement[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type InventoryOverview = {
  readonly totalProducts: number;
  readonly productsInStock: number;
  readonly lowStock: number;
  readonly outOfStock: number;
  readonly inventoryValuePurchaseMinor: number;
  readonly inventoryValueRetailMinor: number;
  readonly totalInventoryQuantity: number;
  readonly recentMovements: readonly InventoryMovement[];
};

export type InventoryTransactionWrite = {
  readonly id: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly productId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly movementType: string;
  readonly direction: "in" | "out";
  readonly quantity: number;
  readonly unitCostMinor: number | null;
  readonly reason: string;
  readonly notes: string | null;
  readonly postedAt: string;
  readonly userId: string;
};

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value.toString();
  }
  return "";
};

const asNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : asString(value);

const asNumber = (value: unknown): number => Number(value ?? 0);

const like = (value: string): string => `%${value.trim().toLowerCase()}%`;

export class InventoryRepository extends BaseRepository<typeof inventoryTransactions> {
  public constructor(private readonly connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: inventoryTransactions,
      tableName: "inventory_transactions",
      searchableColumns: [inventoryTransactions.sourceType, inventoryTransactions.reason],
      dateColumn: inventoryTransactions.postedAt,
      sortableColumns: {
        postedAt: inventoryTransactions.postedAt,
        movementType: inventoryTransactions.movementType,
        status: inventoryTransactions.status,
        quantity: inventoryTransactions.quantity
      }
    });
  }

  public overview(storeId: string): CoreResult<InventoryOverview> {
    const page = this.listInventory({
      storeId,
      page: 1,
      pageSize: 1,
      sortBy: "product",
      sortDirection: "asc",
      status: "all"
    });
    if (!page.ok) {
      return page;
    }

    try {
      const row = this.connection.sqlite
        .prepare(
          `SELECT COUNT(*) AS totalProducts,
                  SUM(CASE WHEN currentStock > 0 THEN 1 ELSE 0 END) AS productsInStock,
                  SUM(CASE WHEN currentStock <= 0 THEN 1 ELSE 0 END) AS outOfStock,
                  SUM(CASE WHEN currentStock > 0 AND currentStock <= minimumStock THEN 1 ELSE 0 END) AS lowStock,
                  SUM(currentStock) AS totalInventoryQuantity,
                  SUM(currentStock * purchasePriceMinor) AS inventoryValuePurchaseMinor,
                  SUM(currentStock * retailPriceMinor) AS inventoryValueRetailMinor
             FROM (${this.inventoryBaseSql()} WHERE p.store_id = ? AND p.archived_at IS NULL)`
        )
        .get(storeId) as Record<string, unknown>;
      const movements = this.listMovements({ storeId, page: 1, pageSize: 8 });
      if (!movements.ok) {
        return movements;
      }
      return ok({
        totalProducts: asNumber(row.totalProducts),
        productsInStock: asNumber(row.productsInStock),
        lowStock: asNumber(row.lowStock),
        outOfStock: asNumber(row.outOfStock),
        inventoryValuePurchaseMinor: asNumber(row.inventoryValuePurchaseMinor),
        inventoryValueRetailMinor: asNumber(row.inventoryValueRetailMinor),
        totalInventoryQuantity: asNumber(row.totalInventoryQuantity),
        recentMovements: movements.value.items
      });
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_READ_FAILED", "Failed to load inventory overview", cause)
      );
    }
  }

  public listInventory(query: InventoryListQuery): CoreResult<InventoryPage> {
    try {
      const where = this.inventoryWhere(query);
      const orderBy = this.inventoryOrder(query.sortBy, query.sortDirection);
      const offset = (query.page - 1) * query.pageSize;
      const sql = `${this.inventoryBaseSql()} ${where.sql}`;
      const rows = this.connection.sqlite
        .prepare(`${sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
        .all(...where.params, query.pageSize, offset);
      const count = this.connection.sqlite
        .prepare(`SELECT COUNT(*) AS count FROM (${sql})`)
        .get(...where.params) as { readonly count: number };
      return ok({
        items: rows.map((row) => this.mapInventoryItem(row)),
        totalItems: count.count,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.max(1, Math.ceil(count.count / query.pageSize))
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to list inventory", cause));
    }
  }

  public listMovements(query: InventoryMovementQuery): CoreResult<InventoryMovementPage> {
    try {
      const where = this.movementWhere(query);
      const rows = this.connection.sqlite
        .prepare(
          `${this.movementBaseSql()} ${where.sql}
            ORDER BY it.posted_at DESC
            LIMIT ? OFFSET ?`
        )
        .all(...where.params, query.pageSize, (query.page - 1) * query.pageSize);
      const count = this.connection.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
             FROM inventory_transactions it
             INNER JOIN products p ON p.id = it.product_id
             LEFT JOIN users u ON u.id = it.posted_by_user_id
            ${where.sql}`
        )
        .get(...where.params) as { readonly count: number };
      return ok({
        items: rows.map((row) => this.mapMovement(row)),
        totalItems: count.count,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.max(1, Math.ceil(count.count / query.pageSize))
      });
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_READ_FAILED", "Failed to list inventory movements", cause)
      );
    }
  }

  public currentStock(productId: string): CoreResult<number> {
    try {
      const row = this.connection.sqlite
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END), 0) AS quantity
             FROM inventory_transactions
            WHERE product_id = ? AND status = 'posted'`
        )
        .get(productId) as { readonly quantity: number };
      return ok(row.quantity);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to read current stock", cause));
    }
  }

  public productExists(productId: string, storeId: string): CoreResult<boolean> {
    try {
      const row = this.connection.sqlite
        .prepare(
          "SELECT id FROM products WHERE id = ? AND store_id = ? AND archived_at IS NULL LIMIT 1"
        )
        .get(productId, storeId);
      return ok(row !== undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to verify product", cause));
    }
  }

  public hasOpeningStock(productId: string): CoreResult<boolean> {
    try {
      const row = this.connection.sqlite
        .prepare(
          "SELECT id FROM inventory_transactions WHERE product_id = ? AND movement_type = 'opening-stock' AND status = 'posted' LIMIT 1"
        )
        .get(productId);
      return ok(row !== undefined);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_READ_FAILED", "Failed to verify opening stock", cause)
      );
    }
  }

  public createTransaction(input: InventoryTransactionWrite): CoreResult<string> {
    try {
      this.connection.sqlite
        .prepare(
          `INSERT INTO inventory_transactions (
            id, store_id, branch_id, business_day_id, product_id, source_type, source_id,
            movement_type, direction, quantity, unit_cost_minor, reason, status,
            posted_at, posted_by_user_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?)`
        )
        .run(
          input.id,
          input.storeId,
          input.branchId,
          input.businessDayId,
          input.productId,
          input.sourceType,
          input.sourceId,
          input.movementType,
          input.direction,
          input.quantity,
          input.unitCostMinor,
          input.notes === null ? input.reason : `${input.reason}: ${input.notes}`,
          input.postedAt,
          input.userId,
          input.postedAt
        );
      return ok(input.id);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create inventory transaction", cause)
      );
    }
  }

  private inventoryBaseSql(): string {
    return `SELECT p.id AS productId, p.barcode, p.sku, p.name AS productName,
                   c.name AS categoryName, NULL AS supplierName,
                   COALESCE(stock.currentStock, 0) AS currentStock,
                   0 AS reservedStock,
                   COALESCE(stock.currentStock, 0) AS availableStock,
                   COALESCE(p.reorder_level_quantity, 0) AS minimumStock,
                   NULL AS maximumStock,
                   COALESCE(p.purchase_cost_minor, 0) AS purchasePriceMinor,
                   COALESCE(p.sale_price_minor, 0) AS retailPriceMinor,
                   COALESCE(stock.currentStock, 0) * COALESCE(p.purchase_cost_minor, 0) AS inventoryValuePurchaseMinor,
                   COALESCE(stock.currentStock, 0) * COALESCE(p.sale_price_minor, 0) AS inventoryValueRetailMinor,
                   CASE
                     WHEN COALESCE(stock.currentStock, 0) <= 0 THEN 'out-of-stock'
                     WHEN COALESCE(stock.currentStock, 0) <= COALESCE(p.reorder_level_quantity, 0) THEN 'low-stock'
                     ELSE 'in-stock'
                   END AS status
              FROM products p
              LEFT JOIN categories c ON c.id = p.category_id
              LEFT JOIN (
                SELECT product_id,
                       SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END) AS currentStock
                  FROM inventory_transactions
                 WHERE status = 'posted'
                 GROUP BY product_id
              ) stock ON stock.product_id = p.id`;
  }

  private inventoryWhere(query: InventoryListQuery): {
    readonly sql: string;
    readonly params: readonly (string | number)[];
  } {
    const clauses = ["p.store_id = ?", "p.archived_at IS NULL", "p.is_stock_tracked = 1"];
    const params: (string | number)[] = [query.storeId];
    if (query.search !== undefined && query.search.trim() !== "") {
      clauses.push(
        "(lower(p.name) LIKE ? OR lower(COALESCE(p.barcode, '')) LIKE ? OR lower(COALESCE(p.sku, '')) LIKE ? OR lower(COALESCE(c.name, '')) LIKE ?)"
      );
      const search = like(query.search);
      params.push(search, search, search, search);
    }
    const status = query.status ?? "all";
    if (status === "out-of-stock") {
      clauses.push("COALESCE(stock.currentStock, 0) <= 0");
    } else if (status === "low-stock") {
      clauses.push("COALESCE(stock.currentStock, 0) > 0");
      clauses.push("COALESCE(stock.currentStock, 0) <= COALESCE(p.reorder_level_quantity, 0)");
    } else if (status === "in-stock") {
      clauses.push("COALESCE(stock.currentStock, 0) > COALESCE(p.reorder_level_quantity, 0)");
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private inventoryOrder(sortBy: InventoryListQuery["sortBy"], direction: "asc" | "desc"): string {
    const dir = direction === "asc" ? "ASC" : "DESC";
    const columns: Record<InventoryListQuery["sortBy"], string> = {
      barcode: "barcode",
      sku: "sku",
      product: "productName",
      category: "categoryName",
      currentStock: "currentStock",
      minimumStock: "minimumStock",
      purchasePrice: "purchasePriceMinor",
      retailPrice: "retailPriceMinor",
      inventoryValue: "inventoryValuePurchaseMinor",
      status: "status"
    };
    return `${columns[sortBy]} ${dir}, productName ASC`;
  }

  private movementBaseSql(): string {
    return `SELECT it.id, it.posted_at AS date, it.product_id AS productId, p.name AS productName,
                   COALESCE(it.reason, it.movement_type) AS reason, it.direction, it.quantity,
                   COALESCE(beforeStock.beforeQuantity, 0) AS beforeQuantity,
                   COALESCE(beforeStock.beforeQuantity, 0) + CASE WHEN it.direction = 'in' THEN it.quantity ELSE -it.quantity END AS afterQuantity,
                   COALESCE(u.display_name, 'System') AS userName,
                   it.source_type || ':' || it.source_id AS reference,
                   it.reason AS notes,
                   it.unit_cost_minor AS unitCostMinor
              FROM inventory_transactions it
              INNER JOIN products p ON p.id = it.product_id
              LEFT JOIN users u ON u.id = it.posted_by_user_id
              LEFT JOIN (
                SELECT target.id,
                       SUM(CASE WHEN previous.direction = 'in' THEN previous.quantity ELSE -previous.quantity END) AS beforeQuantity
                  FROM inventory_transactions target
                  LEFT JOIN inventory_transactions previous
                    ON previous.product_id = target.product_id
                   AND previous.status = 'posted'
                   AND (previous.posted_at < target.posted_at OR (previous.posted_at = target.posted_at AND previous.id < target.id))
                 GROUP BY target.id
              ) beforeStock ON beforeStock.id = it.id`;
  }

  private movementWhere(query: InventoryMovementQuery): {
    readonly sql: string;
    readonly params: readonly string[];
  } {
    const clauses = ["it.store_id = ?", "it.status = 'posted'"];
    const params = [query.storeId];
    if (query.productId !== undefined && query.productId !== "") {
      clauses.push("it.product_id = ?");
      params.push(query.productId);
    }
    if (query.reason !== undefined && query.reason !== "") {
      clauses.push("it.movement_type = ?");
      params.push(query.reason);
    }
    if (query.userId !== undefined && query.userId !== "") {
      clauses.push("it.posted_by_user_id = ?");
      params.push(query.userId);
    }
    if (query.dateFrom !== undefined && query.dateFrom !== "") {
      clauses.push("it.posted_at >= ?");
      params.push(query.dateFrom);
    }
    if (query.dateTo !== undefined && query.dateTo !== "") {
      clauses.push("it.posted_at <= ?");
      params.push(query.dateTo);
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private mapInventoryItem(row: unknown): InventoryItem {
    const record = row as Record<string, unknown>;
    return {
      productId: asString(record.productId),
      barcode: asNullableString(record.barcode),
      sku: asNullableString(record.sku),
      productName: asString(record.productName),
      categoryName: asNullableString(record.categoryName),
      supplierName: asNullableString(record.supplierName),
      currentStock: asNumber(record.currentStock),
      reservedStock: asNumber(record.reservedStock),
      availableStock: asNumber(record.availableStock),
      minimumStock: asNumber(record.minimumStock),
      maximumStock: null,
      purchasePriceMinor: asNumber(record.purchasePriceMinor),
      retailPriceMinor: asNumber(record.retailPriceMinor),
      inventoryValuePurchaseMinor: asNumber(record.inventoryValuePurchaseMinor),
      inventoryValueRetailMinor: asNumber(record.inventoryValueRetailMinor),
      status: asString(record.status) as InventoryItem["status"]
    };
  }

  private mapMovement(row: unknown): InventoryMovement {
    const record = row as Record<string, unknown>;
    return {
      id: asString(record.id),
      date: asString(record.date),
      productId: asString(record.productId),
      productName: asString(record.productName),
      reason: asString(record.reason),
      direction: asString(record.direction) === "out" ? "out" : "in",
      quantity: asNumber(record.quantity),
      beforeQuantity: asNumber(record.beforeQuantity),
      afterQuantity: asNumber(record.afterQuantity),
      userName: asString(record.userName),
      reference: asString(record.reference),
      notes: asNullableString(record.notes),
      unitCostMinor:
        record.unitCostMinor === null || record.unitCostMinor === undefined
          ? null
          : asNumber(record.unitCostMinor)
    };
  }
}
