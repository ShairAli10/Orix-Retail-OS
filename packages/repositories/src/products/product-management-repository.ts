import { randomUUID } from "node:crypto";
import type { CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type { RepositoryConnection } from "../shared/repository-factory.js";
import { repositoryError } from "../shared/repository-error.js";

export type ProductStatusFilter = "active" | "inactive" | "archived" | "all";

export type ProductListQuery = {
  readonly barcode?: string;
  readonly storeId: string;
  readonly search?: string;
  readonly categoryId?: string;
  readonly brandId?: string;
  readonly status?: ProductStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: "barcode" | "name" | "purchasePrice" | "salePrice" | "stock" | "status";
  readonly sortDirection: "asc" | "desc";
};

export type ProductListItem = {
  readonly id: string;
  readonly barcode: string | null;
  readonly name: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly unitId: string;
  readonly unitName: string;
  readonly purchasePriceMinor: number;
  readonly salePriceMinor: number;
  readonly currentStock: number;
  readonly minimumStock: number;
  readonly status: string;
  readonly archivedAt: string | null;
  readonly updatedAt: string | null;
};

export type ProductDetail = ProductListItem & {
  readonly description: string | null;
  readonly createdAt: string;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
};

export type ProductPage = {
  readonly items: readonly ProductListItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type ProductWrite = {
  readonly id?: string;
  readonly storeId: string;
  readonly categoryId: string;
  readonly brandId: string | null;
  readonly unitId: string;
  readonly name: string;
  readonly barcode: string | null;
  readonly description: string | null;
  readonly purchasePriceMinor: number;
  readonly salePriceMinor: number;
  readonly minimumStock: number;
  readonly active: boolean;
  readonly userId: string;
  readonly timestamp: string;
};

export type ProductUpdate = ProductWrite & {
  readonly id: string;
  readonly expectedUpdatedAt?: string | null;
};

export type ProductArchiveRequest = {
  readonly id: string;
  readonly userId: string;
  readonly timestamp: string;
};

export type CatalogItemKind = "category" | "brand" | "unit";

export type CatalogItem = {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly abbreviation?: string;
  readonly status: string;
  readonly archivedAt: string | null;
};

export type ProductCatalog = {
  readonly categories: readonly CatalogItem[];
  readonly brands: readonly CatalogItem[];
  readonly units: readonly CatalogItem[];
};

export type CatalogWrite = {
  readonly storeId: string;
  readonly name: string;
  readonly code?: string | null;
  readonly abbreviation?: string;
  readonly userId: string;
  readonly timestamp: string;
};

const asString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value.toString();
  }
  return "";
};

const asNullableString = (value: unknown): string | null =>
  value === null || value === undefined ? null : asString(value);

const asNumber = (value: unknown): number => Number(value ?? 0);

const wildcard = (value: string): string => `%${value.trim().toLowerCase()}%`;

export class ProductManagementRepository {
  public constructor(private readonly connection: RepositoryConnection) {}

  public listProducts(query: ProductListQuery): CoreResult<ProductPage> {
    try {
      const where = this.createProductWhere(query);
      const orderBy = this.productOrderBy(query.sortBy, query.sortDirection);
      const offset = (query.page - 1) * query.pageSize;
      const rows = this.connection.sqlite
        .prepare(
          `SELECT p.id, p.barcode, p.name, p.category_id AS categoryId, c.name AS categoryName,
                  p.brand_id AS brandId, b.name AS brandName, p.unit_id AS unitId, u.name AS unitName,
                  COALESCE(p.purchase_cost_minor, 0) AS purchasePriceMinor,
                  COALESCE(p.sale_price_minor, 0) AS salePriceMinor,
                  COALESCE(stock.currentStock, 0) AS currentStock,
                  COALESCE(p.reorder_level_quantity, 0) AS minimumStock,
                  p.status, p.archived_at AS archivedAt, p.updated_at AS updatedAt
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             INNER JOIN units u ON u.id = p.unit_id
             LEFT JOIN (
               SELECT product_id,
                      SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END) AS currentStock
                 FROM inventory_transactions
                WHERE status = 'posted'
                GROUP BY product_id
             ) stock ON stock.product_id = p.id
            ${where.sql}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?`
        )
        .all(...where.params, query.pageSize, offset);
      const count = this.connection.sqlite
        .prepare(
          `SELECT COUNT(*) AS count
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
            ${where.sql}`
        )
        .get(...where.params) as { readonly count: number };
      const items = rows.map((row) => this.mapProductListItem(row));

      return ok({
        items,
        totalItems: count.count,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(count.count / query.pageSize)
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to list products", cause));
    }
  }

  public getProduct(id: string): CoreResult<ProductDetail | undefined> {
    try {
      const row = this.connection.sqlite
        .prepare(
          `SELECT p.id, p.barcode, p.name, p.category_id AS categoryId, c.name AS categoryName,
                  p.brand_id AS brandId, b.name AS brandName, p.unit_id AS unitId, u.name AS unitName,
                  p.description, COALESCE(p.purchase_cost_minor, 0) AS purchasePriceMinor,
                  COALESCE(p.sale_price_minor, 0) AS salePriceMinor,
                  COALESCE(stock.currentStock, 0) AS currentStock,
                  COALESCE(p.reorder_level_quantity, 0) AS minimumStock,
                  p.status, p.created_at AS createdAt, p.updated_at AS updatedAt,
                  p.archived_at AS archivedAt, p.created_by_user_id AS createdByUserId,
                  p.updated_by_user_id AS updatedByUserId
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             INNER JOIN units u ON u.id = p.unit_id
             LEFT JOIN (
               SELECT product_id,
                      SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END) AS currentStock
                 FROM inventory_transactions
                WHERE status = 'posted'
                GROUP BY product_id
             ) stock ON stock.product_id = p.id
            WHERE p.id = ?`
        )
        .get(id);

      return ok(row === undefined ? undefined : this.mapProductDetail(row));
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to get product", cause));
    }
  }

  public createProduct(input: ProductWrite): CoreResult<ProductDetail> {
    try {
      const id = input.id ?? randomUUID();
      this.connection.sqlite
        .prepare(
          `INSERT INTO products (
            id, store_id, category_id, brand_id, unit_id, name, barcode, description,
            product_type, status, is_stock_tracked, is_sellable, is_purchasable,
            purchase_cost_minor, sale_price_minor, reorder_level_quantity,
            created_at, updated_at, created_by_user_id, updated_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'standard', ?, 1, 1, 1, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.storeId,
          input.categoryId,
          input.brandId,
          input.unitId,
          input.name,
          input.barcode,
          input.description,
          input.active ? "active" : "inactive",
          input.purchasePriceMinor,
          input.salePriceMinor,
          input.minimumStock,
          input.timestamp,
          input.timestamp,
          input.userId,
          input.userId
        );

      const created = this.getProduct(id);
      if (!created.ok || created.value === undefined) {
        return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to reload created product"));
      }

      return ok(created.value);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create product", cause));
    }
  }

  public updateProduct(input: ProductUpdate): CoreResult<ProductDetail> {
    try {
      const clauses = ["id = ?"];
      const params: (string | number | null)[] = [input.id];
      if (input.expectedUpdatedAt !== undefined) {
        clauses.push(input.expectedUpdatedAt === null ? "updated_at IS NULL" : "updated_at = ?");
        if (input.expectedUpdatedAt !== null) {
          params.push(input.expectedUpdatedAt);
        }
      }

      const result = this.connection.sqlite
        .prepare(
          `UPDATE products
              SET category_id = ?, brand_id = ?, unit_id = ?, name = ?, barcode = ?,
                  description = ?, status = ?, purchase_cost_minor = ?, sale_price_minor = ?,
                  reorder_level_quantity = ?, updated_at = ?, updated_by_user_id = ?
            WHERE ${clauses.join(" AND ")}`
        )
        .run(
          input.categoryId,
          input.brandId,
          input.unitId,
          input.name,
          input.barcode,
          input.description,
          input.active ? "active" : "inactive",
          input.purchasePriceMinor,
          input.salePriceMinor,
          input.minimumStock,
          input.timestamp,
          input.userId,
          ...params
        );

      if (result.changes === 0) {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Product was changed by another operation")
        );
      }

      const updated = this.getProduct(input.id);
      if (!updated.ok || updated.value === undefined) {
        return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to reload updated product"));
      }

      return ok(updated.value);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update product", cause));
    }
  }

  public archiveProduct(input: ProductArchiveRequest): CoreResult<void> {
    try {
      this.connection.sqlite
        .prepare(
          "UPDATE products SET archived_at = ?, updated_at = ?, updated_by_user_id = ? WHERE id = ?"
        )
        .run(input.timestamp, input.timestamp, input.userId, input.id);
      return ok(undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to archive product", cause));
    }
  }

  public restoreProduct(input: ProductArchiveRequest): CoreResult<void> {
    try {
      this.connection.sqlite
        .prepare(
          "UPDATE products SET archived_at = NULL, updated_at = ?, updated_by_user_id = ? WHERE id = ?"
        )
        .run(input.timestamp, input.userId, input.id);
      return ok(undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to restore product", cause));
    }
  }

  public productNameExists(
    storeId: string,
    name: string,
    exceptProductId?: string
  ): CoreResult<boolean> {
    return this.exists(
      "SELECT id FROM products WHERE store_id = ? AND lower(name) = lower(?) AND (? IS NULL OR id <> ?) LIMIT 1",
      [storeId, name, exceptProductId ?? null, exceptProductId ?? null]
    );
  }

  public barcodeExists(
    storeId: string,
    barcode: string,
    exceptProductId?: string
  ): CoreResult<boolean> {
    return this.exists(
      "SELECT id FROM products WHERE store_id = ? AND barcode = ? AND (? IS NULL OR id <> ?) LIMIT 1",
      [storeId, barcode, exceptProductId ?? null, exceptProductId ?? null]
    );
  }

  public productHasCompletedReferences(productId: string): CoreResult<boolean> {
    return this.exists(
      `SELECT si.id
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
        WHERE si.product_id = ? AND s.status = 'completed'
        UNION
       SELECT pi.id
         FROM purchase_items pi
         INNER JOIN purchases p ON p.id = pi.purchase_id
        WHERE pi.product_id = ? AND p.status = 'received'
        LIMIT 1`,
      [productId, productId]
    );
  }

  public getCatalog(storeId: string, includeArchived = false): CoreResult<ProductCatalog> {
    try {
      return ok({
        categories: this.listCatalogItems("category", storeId, includeArchived),
        brands: this.listCatalogItems("brand", storeId, includeArchived),
        units: this.listCatalogItems("unit", storeId, includeArchived)
      });
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_READ_FAILED", "Failed to load product catalog", cause)
      );
    }
  }

  public createCatalogItem(kind: CatalogItemKind, input: CatalogWrite): CoreResult<CatalogItem> {
    try {
      const id = randomUUID();
      if (kind === "category") {
        this.connection.sqlite
          .prepare(
            `INSERT INTO categories (
              id, store_id, name, code, status, created_at, updated_at, created_by_user_id, updated_by_user_id
            ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
          )
          .run(
            id,
            input.storeId,
            input.name,
            input.code ?? null,
            input.timestamp,
            input.timestamp,
            input.userId,
            input.userId
          );
      } else if (kind === "brand") {
        this.connection.sqlite
          .prepare(
            `INSERT INTO brands (
              id, store_id, name, code, status, created_at, updated_at, created_by_user_id, updated_by_user_id
            ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
          )
          .run(
            id,
            input.storeId,
            input.name,
            input.code ?? null,
            input.timestamp,
            input.timestamp,
            input.userId,
            input.userId
          );
      } else {
        this.connection.sqlite
          .prepare(
            `INSERT INTO units (
              id, store_id, name, abbreviation, status, created_at, updated_at, created_by_user_id, updated_by_user_id
            ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
          )
          .run(
            id,
            input.storeId,
            input.name,
            input.abbreviation ?? input.name,
            input.timestamp,
            input.timestamp,
            input.userId,
            input.userId
          );
      }

      const item = this.getCatalogItem(kind, id);
      if (item === undefined) {
        return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to reload catalog item"));
      }
      return ok(item);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create catalog item", cause)
      );
    }
  }

  public updateCatalogItem(
    kind: CatalogItemKind,
    id: string,
    input: CatalogWrite
  ): CoreResult<CatalogItem> {
    try {
      const table = this.catalogTable(kind);
      const abbreviationClause = kind === "unit" ? ", abbreviation = ?" : "";
      const params =
        kind === "unit"
          ? [input.name, input.abbreviation ?? input.name, input.timestamp, input.userId, id]
          : [input.name, input.timestamp, input.userId, id];
      this.connection.sqlite
        .prepare(
          `UPDATE ${table} SET name = ?${abbreviationClause}, updated_at = ?, updated_by_user_id = ? WHERE id = ?`
        )
        .run(...params);
      const item = this.getCatalogItem(kind, id);
      return item === undefined
        ? err(repositoryError("REPOSITORY_NOT_FOUND", "Catalog item was not found"))
        : ok(item);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update catalog item", cause)
      );
    }
  }

  public archiveCatalogItem(
    kind: CatalogItemKind,
    id: string,
    timestamp: string,
    userId: string
  ): CoreResult<void> {
    const used = this.catalogItemIsUsed(kind, id);
    if (!used.ok) {
      return used;
    }
    if (used.value) {
      return err(repositoryError("REPOSITORY_CONFLICT", `${kind} is used by products`));
    }

    try {
      this.connection.sqlite
        .prepare(
          `UPDATE ${this.catalogTable(kind)} SET archived_at = ?, updated_at = ?, updated_by_user_id = ? WHERE id = ?`
        )
        .run(timestamp, timestamp, userId, id);
      return ok(undefined);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to archive catalog item", cause)
      );
    }
  }

  public restoreCatalogItem(
    kind: CatalogItemKind,
    id: string,
    timestamp: string,
    userId: string
  ): CoreResult<void> {
    try {
      this.connection.sqlite
        .prepare(
          `UPDATE ${this.catalogTable(kind)} SET archived_at = NULL, updated_at = ?, updated_by_user_id = ? WHERE id = ?`
        )
        .run(timestamp, userId, id);
      return ok(undefined);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to restore catalog item", cause)
      );
    }
  }

  public createOpeningStock(
    productId: string,
    input: ProductWrite,
    quantity: number,
    branchId: string,
    businessDayId: string
  ): CoreResult<void> {
    if (quantity <= 0) {
      return ok(undefined);
    }

    try {
      this.connection.sqlite
        .prepare(
          `INSERT INTO inventory_transactions (
            id, store_id, branch_id, business_day_id, product_id, source_type, source_id,
            movement_type, direction, quantity, unit_cost_minor, reason, status,
            posted_at, posted_by_user_id, created_at
          ) VALUES (?, ?, ?, ?, ?, 'opening-stock', ?, 'opening-stock', 'in', ?, ?, 'Opening stock', 'posted', ?, ?, ?)`
        )
        .run(
          randomUUID(),
          input.storeId,
          branchId,
          businessDayId,
          productId,
          productId,
          quantity,
          input.purchasePriceMinor,
          input.timestamp,
          input.userId,
          input.timestamp
        );
      return ok(undefined);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create opening stock", cause)
      );
    }
  }

  private createProductWhere(query: ProductListQuery): {
    readonly sql: string;
    readonly params: readonly (string | number)[];
  } {
    const clauses = ["p.store_id = ?"];
    const params: (string | number)[] = [query.storeId];
    if (query.categoryId !== undefined && query.categoryId !== "") {
      clauses.push("p.category_id = ?");
      params.push(query.categoryId);
    }
    if (query.brandId !== undefined && query.brandId !== "") {
      clauses.push("p.brand_id = ?");
      params.push(query.brandId);
    }
    if (query.status === "archived") {
      clauses.push("p.archived_at IS NOT NULL");
    } else if (query.status === "all") {
      // Include active, inactive, and archived records for administrative review.
    } else {
      clauses.push("p.archived_at IS NULL");
      if (query.status !== undefined) {
        clauses.push("p.status = ?");
        params.push(query.status);
      }
    }
    if (query.barcode !== undefined) {
      clauses.push("p.barcode = ?");
      params.push(query.barcode.trim());
    }
    if (query.search !== undefined && query.search.trim() !== "") {
      clauses.push(
        "(lower(p.name) LIKE ? OR lower(COALESCE(p.barcode, '')) LIKE ? OR lower(COALESCE(c.name, '')) LIKE ? OR lower(COALESCE(b.name, '')) LIKE ?)"
      );
      const search = wildcard(query.search);
      params.push(search, search, search, search);
    }

    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private productOrderBy(
    sortBy: ProductListQuery["sortBy"],
    direction: ProductListQuery["sortDirection"]
  ): string {
    const dir = direction === "asc" ? "ASC" : "DESC";
    const columns: Record<ProductListQuery["sortBy"], string> = {
      barcode: "p.barcode",
      name: "p.name",
      purchasePrice: "purchasePriceMinor",
      salePrice: "salePriceMinor",
      stock: "currentStock",
      status: "p.status"
    };
    return `${columns[sortBy]} ${dir}, p.name ASC`;
  }

  private mapProductListItem(row: unknown): ProductListItem {
    const record = row as Record<string, unknown>;
    return {
      id: asString(record.id),
      barcode: asNullableString(record.barcode),
      name: asString(record.name),
      categoryId: asNullableString(record.categoryId),
      categoryName: asNullableString(record.categoryName),
      brandId: asNullableString(record.brandId),
      brandName: asNullableString(record.brandName),
      unitId: asString(record.unitId),
      unitName: asString(record.unitName),
      purchasePriceMinor: asNumber(record.purchasePriceMinor),
      salePriceMinor: asNumber(record.salePriceMinor),
      currentStock: asNumber(record.currentStock),
      minimumStock: asNumber(record.minimumStock),
      status: asString(record.status),
      archivedAt: asNullableString(record.archivedAt),
      updatedAt: asNullableString(record.updatedAt)
    };
  }

  private mapProductDetail(row: unknown): ProductDetail {
    const base = this.mapProductListItem(row);
    const record = row as Record<string, unknown>;
    return {
      ...base,
      description: asNullableString(record.description),
      createdAt: asString(record.createdAt),
      createdByUserId: asNullableString(record.createdByUserId),
      updatedByUserId: asNullableString(record.updatedByUserId)
    };
  }

  private exists(sql: string, params: readonly (string | null)[]): CoreResult<boolean> {
    try {
      return ok(this.connection.sqlite.prepare(sql).get(...params) !== undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to check existence", cause));
    }
  }

  private listCatalogItems(
    kind: CatalogItemKind,
    storeId: string,
    includeArchived: boolean
  ): readonly CatalogItem[] {
    const archiveClause = includeArchived ? "" : "AND archived_at IS NULL";
    const rows = this.connection.sqlite
      .prepare(
        `SELECT * FROM ${this.catalogTable(kind)} WHERE store_id = ? ${archiveClause} ORDER BY name ASC`
      )
      .all(storeId);
    return rows.map((row) => this.mapCatalogItem(kind, row));
  }

  private getCatalogItem(kind: CatalogItemKind, id: string): CatalogItem | undefined {
    const row = this.connection.sqlite
      .prepare(`SELECT * FROM ${this.catalogTable(kind)} WHERE id = ?`)
      .get(id);
    return row === undefined ? undefined : this.mapCatalogItem(kind, row);
  }

  private mapCatalogItem(kind: CatalogItemKind, row: unknown): CatalogItem {
    const record = row as Record<string, unknown>;
    const base = {
      id: asString(record.id),
      name: asString(record.name),
      code: asNullableString(record.code),
      status: asString(record.status),
      archivedAt: asNullableString(record.archived_at)
    };
    return kind === "unit" ? { ...base, abbreviation: asString(record.abbreviation) } : base;
  }

  private catalogItemIsUsed(kind: CatalogItemKind, id: string): CoreResult<boolean> {
    const column = kind === "category" ? "category_id" : kind === "brand" ? "brand_id" : "unit_id";
    return this.exists(`SELECT id FROM products WHERE ${column} = ? LIMIT 1`, [id]);
  }

  private catalogTable(kind: CatalogItemKind): "categories" | "brands" | "units" {
    if (kind === "category") {
      return "categories";
    }
    return kind === "brand" ? "brands" : "units";
  }
}
