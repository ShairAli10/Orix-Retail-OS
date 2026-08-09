import { randomUUID } from "node:crypto";
import { purchases } from "@orix/database";
import type { CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";
import { repositoryError } from "../shared/repository-error.js";

export type PurchaseStatusFilter = "draft" | "received" | "cancelled" | "all";
export type PurchaseSortBy =
  "purchaseNumber" | "supplier" | "purchaseDate" | "dueDate" | "total" | "status" | "createdAt";

export type PurchaseItemWrite = {
  readonly id?: string;
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
};

export type PurchaseWrite = {
  readonly id?: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly supplierId: string;
  readonly invoiceNumber?: string | null;
  readonly purchaseNumber?: string | null;
  readonly purchaseDate: string;
  readonly dueDate?: string | null;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly freightMinor: number;
  readonly otherChargesMinor: number;
  readonly notes?: string | null;
  readonly items: readonly PurchaseItemWrite[];
  readonly expectedUpdatedAt?: string | null;
};

export type PurchaseListQuery = {
  readonly storeId: string;
  readonly search?: string;
  readonly supplierId?: string;
  readonly status?: PurchaseStatusFilter;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: PurchaseSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type PurchaseMetadata = {
  readonly invoiceNumber: string | null;
  readonly dueDate: string | null;
  readonly freightMinor: number;
  readonly otherChargesMinor: number;
  readonly notes: string | null;
  readonly cancellationReason: string | null;
};

export type PurchaseListItem = {
  readonly id: string;
  readonly purchaseNumber: string;
  readonly invoiceNumber: string | null;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly purchaseDate: string;
  readonly dueDate: string | null;
  readonly itemCount: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly paymentStatus: "unpaid" | "partial" | "paid";
  readonly status: "draft" | "received" | "cancelled";
  readonly receivedAt: string | null;
  readonly cancelledAt: string | null;
  readonly updatedAt: string | null;
};

export type PurchaseItem = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly lineTotalMinor: number;
  readonly returnedQuantity: number;
};

export type PurchaseDetail = PurchaseListItem & {
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly freightMinor: number;
  readonly otherChargesMinor: number;
  readonly notes: string | null;
  readonly items: readonly PurchaseItem[];
  readonly createdAt: string;
  readonly createdByUserId: string;
};

export type PurchaseReturnItemWrite = {
  readonly purchaseItemId: string;
  readonly quantity: number;
};

export type PurchaseReturnWrite = {
  readonly purchaseId: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly reason: string;
  readonly items: readonly PurchaseReturnItemWrite[];
};

export type PurchaseReturnItem = {
  readonly id: string;
  readonly purchaseItemId: string;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly lineTotalMinor: number;
};

export type PurchaseReturnDetail = {
  readonly id: string;
  readonly returnNumber: string;
  readonly purchaseId: string;
  readonly purchaseNumber: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly reason: string;
  readonly totalValueMinor: number;
  readonly payableReductionMinor: number;
  readonly returnedAt: string;
  readonly items: readonly PurchaseReturnItem[];
};

export type PurchasePage = {
  readonly items: readonly PurchaseListItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

type PurchaseRow = {
  readonly id: string;
  readonly purchaseNumber: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly status: "draft" | "received" | "cancelled";
  readonly purchaseDate: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly metadataJson: string | null;
  readonly receivedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly createdByUserId: string;
  readonly itemCount: number;
};

type PurchaseItemRow = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly quantity: number;
  readonly unitCostMinor: number;
  readonly discountMinor: number | null;
  readonly taxMinor: number | null;
  readonly lineTotalMinor: number;
  readonly returnedQuantity: number | null;
};

type CountRow = { readonly count: number };
type IdRow = { readonly id: string };
type MoneyRow = { readonly amount: number | null };
type PurchaseReturnRow = Omit<PurchaseReturnDetail, "items">;
type PurchaseReturnItemRow = PurchaseReturnItem;

const defaultMetadata: PurchaseMetadata = {
  invoiceNumber: null,
  dueDate: null,
  freightMinor: 0,
  otherChargesMinor: 0,
  notes: null,
  cancellationReason: null
};

export class PurchaseRepository extends BaseRepository<typeof purchases> {
  private readonly connection: RepositoryConnection;

  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: purchases,
      tableName: "purchases",
      searchableColumns: [purchases.purchaseNumber],
      documentNumberColumn: purchases.purchaseNumber,
      dateColumn: purchases.purchaseDate,
      sortableColumns: {
        purchaseNumber: purchases.purchaseNumber,
        purchaseDate: purchases.purchaseDate,
        createdAt: purchases.createdAt,
        status: purchases.status,
        totalMinor: purchases.totalMinor
      }
    });
    this.connection = connection;
  }

  public listPurchases(query: PurchaseListQuery): CoreResult<PurchasePage> {
    try {
      const page = Math.max(1, query.page);
      const pageSize = Math.max(1, query.pageSize);
      const where = this.purchaseWhere(query);
      const totalItems = (
        this.connection.sqlite
          .prepare(`SELECT COUNT(*) AS count FROM (${this.purchaseBaseSql()} ${where.sql})`)
          .get(...where.params) as CountRow
      ).count;
      const rows = this.connection.sqlite
        .prepare(
          `${this.purchaseBaseSql()} ${where.sql} ${this.purchaseOrder(query)} LIMIT ? OFFSET ?`
        )
        .all(...where.params, pageSize, (page - 1) * pageSize) as PurchaseRow[];
      return ok({
        items: rows.map((row) => this.mapPurchase(row)),
        totalItems,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to list purchases", cause));
    }
  }

  public getPurchase(id: string): CoreResult<PurchaseDetail | undefined> {
    try {
      const row = this.connection.sqlite
        .prepare(`${this.purchaseBaseSql()} WHERE p.id = ? LIMIT 1`)
        .get(id) as PurchaseRow | undefined;
      if (row === undefined) return ok(undefined);
      const items = this.loadItems(id);
      if (!items.ok) return items;
      return ok({ ...this.mapPurchaseDetail(row), items: items.value });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load purchase", cause));
    }
  }

  public saveDraft(input: PurchaseWrite): CoreResult<PurchaseDetail> {
    return input.id === undefined
      ? this.createDraft(input)
      : this.updateDraft({ ...input, id: input.id });
  }

  public receivePurchase(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): CoreResult<PurchaseDetail> {
    try {
      const existing = this.getPurchase(input.id);
      if (!existing.ok) return existing;
      if (existing.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Purchase was not found"));
      }
      if (existing.value.status !== "draft") {
        return err(repositoryError("REPOSITORY_CONFLICT", "Only draft purchases can be received"));
      }
      if (existing.value.items.length === 0) {
        return err(repositoryError("REPOSITORY_CONFLICT", "Purchase has no items"));
      }
      const timestamp = new Date().toISOString();
      this.connection.sqlite
        .prepare(
          `UPDATE purchases
              SET status = 'received', received_at = ?, received_by_user_id = ?,
                  approved_at = ?, approved_by_user_id = ?, updated_at = ?
            WHERE id = ?`
        )
        .run(timestamp, input.userId, timestamp, input.userId, timestamp, input.id);
      for (const item of existing.value.items) {
        this.connection.sqlite
          .prepare(
            `INSERT INTO inventory_transactions (
              id, store_id, branch_id, business_day_id, product_id, source_type, source_id,
              movement_type, direction, quantity, unit_cost_minor, reason, status,
              posted_at, posted_by_user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, 'purchase', ?, 'purchase-received', 'in', ?, ?, 'purchase-received', 'posted', ?, ?, ?)`
          )
          .run(
            randomUUID(),
            input.storeId,
            input.branchId,
            input.businessDayId,
            item.productId,
            input.id,
            item.quantity,
            item.unitCostMinor,
            timestamp,
            input.userId,
            timestamp
          );
      }
      const accounts = this.ensureLedgerAccounts(input.storeId, input.userId);
      const ledgerTransactionId = randomUUID();
      this.connection.sqlite
        .prepare(
          `INSERT INTO ledger_transactions (
            id, store_id, branch_id, business_day_id, source_type, source_id,
            transaction_type, status, posted_at, posted_by_user_id, memo, created_at
          ) VALUES (?, ?, ?, ?, 'purchase', ?, 'purchase', 'posted', ?, ?, ?, ?)`
        )
        .run(
          ledgerTransactionId,
          input.storeId,
          input.branchId,
          input.businessDayId,
          input.id,
          timestamp,
          input.userId,
          `Purchase ${existing.value.purchaseNumber}`,
          timestamp
        );
      this.insertLedgerEntry(
        ledgerTransactionId,
        accounts.inventoryAccountId,
        "asset",
        null,
        null,
        existing.value.totalMinor,
        0,
        "Inventory received"
      );
      this.insertLedgerEntry(
        ledgerTransactionId,
        accounts.payableAccountId,
        "payable",
        "supplier",
        existing.value.supplierId,
        0,
        existing.value.totalMinor,
        "Supplier payable"
      );
      this.writeAudit(input, "PurchaseReceived", input.id, {
        purchaseNumber: existing.value.purchaseNumber,
        totalMinor: existing.value.totalMinor
      });
      return this.getRequiredPurchase(input.id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to receive purchase", cause));
    }
  }

  public cancelDraft(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
    readonly reason: string;
  }): CoreResult<void> {
    try {
      const existing = this.getPurchase(input.id);
      if (!existing.ok) return existing;
      if (existing.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Purchase was not found"));
      }
      if (existing.value.status !== "draft") {
        return err(repositoryError("REPOSITORY_CONFLICT", "Only draft purchases can be cancelled"));
      }
      const metadataRow = this.connection.sqlite
        .prepare("SELECT cancellation_reason AS metadataJson FROM purchases WHERE id = ?")
        .get(input.id) as { readonly metadataJson: string | null };
      const metadata = this.decodeMetadata(metadataRow.metadataJson);
      const timestamp = new Date().toISOString();
      this.connection.sqlite
        .prepare(
          `UPDATE purchases
              SET status = 'cancelled', cancelled_at = ?, cancelled_by_user_id = ?,
                  cancellation_reason = ?, updated_at = ?
            WHERE id = ?`
        )
        .run(
          timestamp,
          input.userId,
          this.encodeMetadata({ ...metadata, cancellationReason: input.reason }),
          timestamp,
          input.id
        );
      this.writeAudit(input, "PurchaseCancelled", input.id, { reason: input.reason });
      return ok(undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to cancel purchase", cause));
    }
  }

  public returnPurchase(input: PurchaseReturnWrite): CoreResult<PurchaseReturnDetail> {
    try {
      const purchase = this.getPurchase(input.purchaseId);
      if (!purchase.ok) return purchase;
      if (purchase.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Purchase was not found"));
      }
      if (purchase.value.status !== "received") {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Only received purchases can be returned")
        );
      }
      const byItem = new Map(purchase.value.items.map((item) => [item.id, item]));
      const lines = input.items
        .map((item) => {
          const original = byItem.get(item.purchaseItemId);
          if (original === undefined) return undefined;
          const available = original.quantity - original.returnedQuantity;
          return { requested: item, original, available };
        })
        .filter((line): line is NonNullable<typeof line> => line !== undefined);
      if (lines.length !== input.items.length || lines.length === 0) {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Return contains invalid purchase items")
        );
      }
      for (const line of lines) {
        if (line.requested.quantity <= 0 || line.requested.quantity > line.available) {
          return err(
            repositoryError(
              "REPOSITORY_CONFLICT",
              `${line.original.productName} cannot be returned for the requested quantity`
            )
          );
        }
        const stock = this.currentStock(line.original.productId);
        if (stock < line.requested.quantity) {
          return err(
            repositoryError(
              "REPOSITORY_CONFLICT",
              `${line.original.productName} does not have enough stock to return to supplier`
            )
          );
        }
      }
      const timestamp = new Date().toISOString();
      const returnId = randomUUID();
      const returnNumber = this.nextPurchaseReturnNumber(input.branchId);
      const totalValueMinor = lines.reduce(
        (total, line) => total + line.requested.quantity * line.original.unitCostMinor,
        0
      );
      this.connection.sqlite
        .prepare(
          `INSERT INTO purchase_returns (
            id, store_id, branch_id, business_day_id, original_purchase_id, supplier_id,
            return_number, status, reason, total_value_minor, payable_reduction_minor,
            returned_at, created_at, updated_at, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          returnId,
          input.storeId,
          input.branchId,
          input.businessDayId,
          purchase.value.id,
          purchase.value.supplierId,
          returnNumber,
          input.reason.trim(),
          totalValueMinor,
          totalValueMinor,
          timestamp,
          timestamp,
          timestamp,
          input.userId
        );
      for (const line of lines) {
        const lineTotalMinor = line.requested.quantity * line.original.unitCostMinor;
        this.connection.sqlite
          .prepare(
            `INSERT INTO purchase_return_items (
              id, purchase_return_id, purchase_item_id, product_id, quantity, unit_cost_minor,
              line_total_minor, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            randomUUID(),
            returnId,
            line.original.id,
            line.original.productId,
            line.requested.quantity,
            line.original.unitCostMinor,
            lineTotalMinor,
            timestamp
          );
        this.connection.sqlite
          .prepare(
            `UPDATE purchase_items
                SET returned_quantity = COALESCE(returned_quantity, 0) + ?, updated_at = ?
              WHERE id = ?`
          )
          .run(line.requested.quantity, timestamp, line.original.id);
        this.connection.sqlite
          .prepare(
            `INSERT INTO inventory_transactions (
              id, store_id, branch_id, business_day_id, product_id, source_type, source_id,
              movement_type, direction, quantity, unit_cost_minor, reason, status,
              posted_at, posted_by_user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, 'purchase_return', ?, 'purchase-return', 'out', ?, ?, ?, 'posted', ?, ?, ?)`
          )
          .run(
            randomUUID(),
            input.storeId,
            input.branchId,
            input.businessDayId,
            line.original.productId,
            returnId,
            line.requested.quantity,
            line.original.unitCostMinor,
            input.reason.trim(),
            timestamp,
            input.userId,
            timestamp
          );
      }
      this.postReturnLedger(purchase.value, input, returnId, totalValueMinor, timestamp);
      this.writeAudit(input, "PurchaseReturned", returnId, {
        purchaseId: purchase.value.id,
        purchaseNumber: purchase.value.purchaseNumber,
        returnNumber,
        totalValueMinor,
        reason: input.reason.trim()
      });
      const created = this.getPurchaseReturn(returnId);
      return created.ok && created.value !== undefined
        ? ok(created.value)
        : err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load purchase return"));
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to return purchase", cause));
    }
  }

  public getPurchaseReturn(id: string): CoreResult<PurchaseReturnDetail | undefined> {
    try {
      const row = this.connection.sqlite
        .prepare(
          `SELECT pr.id, pr.return_number AS returnNumber,
                  pr.original_purchase_id AS purchaseId, p.purchase_number AS purchaseNumber,
                  pr.supplier_id AS supplierId, s.name AS supplierName, pr.reason,
                  pr.total_value_minor AS totalValueMinor,
                  pr.payable_reduction_minor AS payableReductionMinor,
                  pr.returned_at AS returnedAt
             FROM purchase_returns pr
             JOIN purchases p ON p.id = pr.original_purchase_id
             JOIN suppliers s ON s.id = pr.supplier_id
            WHERE pr.id = ?
            LIMIT 1`
        )
        .get(id) as PurchaseReturnRow | undefined;
      if (row === undefined) return ok(undefined);
      const items = this.connection.sqlite
        .prepare(
          `SELECT pri.id, pri.purchase_item_id AS purchaseItemId, pri.product_id AS productId,
                  p.name AS productName, pri.quantity, pri.unit_cost_minor AS unitCostMinor,
                  pri.line_total_minor AS lineTotalMinor
             FROM purchase_return_items pri
             JOIN products p ON p.id = pri.product_id
            WHERE pri.purchase_return_id = ?
            ORDER BY pri.created_at ASC`
        )
        .all(id) as PurchaseReturnItemRow[];
      return ok({ ...row, items });
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_READ_FAILED", "Failed to load purchase return", cause)
      );
    }
  }

  private createDraft(input: PurchaseWrite): CoreResult<PurchaseDetail> {
    try {
      const id = randomUUID();
      const timestamp = new Date().toISOString();
      const totals = this.calculateTotals(input);
      const requestedPurchaseNumber = input.purchaseNumber?.trim();
      const purchaseNumber =
        requestedPurchaseNumber !== undefined && requestedPurchaseNumber.length > 0
          ? requestedPurchaseNumber
          : this.nextPurchaseNumber(input.branchId);
      this.connection.sqlite
        .prepare(
          `INSERT INTO purchases (
            id, store_id, branch_id, business_day_id, supplier_id, purchase_number, status,
            purchase_date, subtotal_minor, discount_minor, tax_minor, total_minor, paid_minor,
            cancellation_reason, created_at, updated_at, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.storeId,
          input.branchId,
          input.businessDayId,
          input.supplierId,
          purchaseNumber,
          input.purchaseDate,
          totals.subtotalMinor,
          input.discountMinor,
          input.taxMinor,
          totals.totalMinor,
          this.encodeMetadata(this.metadataFromInput(input)),
          timestamp,
          timestamp,
          input.userId
        );
      this.replaceItems(id, input.items, timestamp);
      this.writeAudit(input, "PurchaseCreated", id, {
        purchaseNumber,
        totalMinor: totals.totalMinor
      });
      return this.getRequiredPurchase(id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create purchase", cause));
    }
  }

  private updateDraft(input: PurchaseWrite & { readonly id: string }): CoreResult<PurchaseDetail> {
    try {
      const existing = this.getPurchase(input.id);
      if (!existing.ok) return existing;
      if (existing.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Purchase was not found"));
      }
      if (existing.value.status !== "draft") {
        return err(repositoryError("REPOSITORY_CONFLICT", "Only draft purchases can be edited"));
      }
      if (
        input.expectedUpdatedAt !== undefined &&
        existing.value.updatedAt !== input.expectedUpdatedAt
      ) {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Purchase was changed by another action")
        );
      }
      const timestamp = new Date().toISOString();
      const totals = this.calculateTotals(input);
      const requestedPurchaseNumber = input.purchaseNumber?.trim();
      this.connection.sqlite
        .prepare(
          `UPDATE purchases
              SET supplier_id = ?, purchase_number = ?, purchase_date = ?, subtotal_minor = ?,
                  discount_minor = ?, tax_minor = ?, total_minor = ?, cancellation_reason = ?,
                  updated_at = ?
            WHERE id = ?`
        )
        .run(
          input.supplierId,
          requestedPurchaseNumber !== undefined && requestedPurchaseNumber.length > 0
            ? requestedPurchaseNumber
            : existing.value.purchaseNumber,
          input.purchaseDate,
          totals.subtotalMinor,
          input.discountMinor,
          input.taxMinor,
          totals.totalMinor,
          this.encodeMetadata(this.metadataFromInput(input)),
          timestamp,
          input.id
        );
      this.connection.sqlite
        .prepare("DELETE FROM purchase_items WHERE purchase_id = ?")
        .run(input.id);
      this.replaceItems(input.id, input.items, timestamp);
      this.writeAudit(input, "PurchaseUpdated", input.id, { totalMinor: totals.totalMinor });
      return this.getRequiredPurchase(input.id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update purchase", cause));
    }
  }

  private purchaseBaseSql(): string {
    return `
      SELECT p.id, p.purchase_number AS purchaseNumber, p.supplier_id AS supplierId,
             s.name AS supplierName, p.status, p.purchase_date AS purchaseDate,
             p.subtotal_minor AS subtotalMinor, p.discount_minor AS discountMinor,
             p.tax_minor AS taxMinor, p.total_minor AS totalMinor, p.paid_minor AS paidMinor,
             p.cancellation_reason AS metadataJson, p.received_at AS receivedAt,
             p.cancelled_at AS cancelledAt, p.created_at AS createdAt, p.updated_at AS updatedAt,
             p.created_by_user_id AS createdByUserId,
             COALESCE(items.itemCount, 0) AS itemCount
        FROM purchases p
        JOIN suppliers s ON s.id = p.supplier_id
        LEFT JOIN (
          SELECT purchase_id, COUNT(*) AS itemCount
            FROM purchase_items
           GROUP BY purchase_id
        ) items ON items.purchase_id = p.id`;
  }

  private purchaseWhere(query: PurchaseListQuery): {
    readonly sql: string;
    readonly params: readonly unknown[];
  } {
    const clauses = ["p.store_id = ?"];
    const params: unknown[] = [query.storeId];
    if (query.status !== undefined && query.status !== "all") {
      clauses.push("p.status = ?");
      params.push(query.status);
    }
    if (query.supplierId !== undefined && query.supplierId.length > 0) {
      clauses.push("p.supplier_id = ?");
      params.push(query.supplierId);
    }
    if (query.dateFrom !== undefined && query.dateFrom.length > 0) {
      clauses.push("p.purchase_date >= ?");
      params.push(query.dateFrom);
    }
    if (query.dateTo !== undefined && query.dateTo.length > 0) {
      clauses.push("p.purchase_date <= ?");
      params.push(query.dateTo);
    }
    const search = query.search?.trim().toLowerCase();
    if (search !== undefined && search.length > 0) {
      clauses.push(
        "(lower(p.purchase_number) LIKE ? OR lower(s.name) LIKE ? OR lower(COALESCE(p.cancellation_reason, '')) LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private purchaseOrder(query: PurchaseListQuery): string {
    const direction = query.sortDirection === "desc" ? "DESC" : "ASC";
    const column: Record<PurchaseSortBy, string> = {
      purchaseNumber: "p.purchase_number",
      supplier: "s.name",
      purchaseDate: "p.purchase_date",
      dueDate: "p.cancellation_reason",
      total: "p.total_minor",
      status: "p.status",
      createdAt: "p.created_at"
    };
    return `ORDER BY ${column[query.sortBy]} ${direction}, p.created_at DESC`;
  }

  private loadItems(purchaseId: string): CoreResult<readonly PurchaseItem[]> {
    try {
      const rows = this.connection.sqlite
        .prepare(
          `SELECT pi.id, pi.product_id AS productId, p.name AS productName,
                  pi.unit_id AS unitId, u.name AS unitName, pi.quantity,
                  pi.unit_cost_minor AS unitCostMinor, pi.discount_minor AS discountMinor,
                  pi.tax_minor AS taxMinor, pi.line_total_minor AS lineTotalMinor,
                  pi.returned_quantity AS returnedQuantity
             FROM purchase_items pi
             JOIN products p ON p.id = pi.product_id
             JOIN units u ON u.id = pi.unit_id
            WHERE pi.purchase_id = ?
            ORDER BY pi.created_at ASC`
        )
        .all(purchaseId) as PurchaseItemRow[];
      return ok(
        rows.map((row) => ({
          id: row.id,
          productId: row.productId,
          productName: row.productName,
          unitId: row.unitId,
          unitName: row.unitName,
          quantity: row.quantity,
          unitCostMinor: row.unitCostMinor,
          discountMinor: row.discountMinor ?? 0,
          taxMinor: row.taxMinor ?? 0,
          lineTotalMinor: row.lineTotalMinor,
          returnedQuantity: row.returnedQuantity ?? 0
        }))
      );
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load purchase items", cause));
    }
  }

  private replaceItems(
    purchaseId: string,
    items: readonly PurchaseItemWrite[],
    timestamp: string
  ): void {
    for (const item of items) {
      const lineTotalMinor =
        item.quantity * item.unitCostMinor - item.discountMinor + item.taxMinor;
      this.connection.sqlite
        .prepare(
          `INSERT INTO purchase_items (
            id, purchase_id, product_id, unit_id, quantity, unit_cost_minor,
            discount_minor, tax_minor, line_total_minor, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          item.id ?? randomUUID(),
          purchaseId,
          item.productId,
          item.unitId,
          item.quantity,
          item.unitCostMinor,
          item.discountMinor,
          item.taxMinor,
          lineTotalMinor,
          timestamp,
          timestamp
        );
    }
  }

  private calculateTotals(input: PurchaseWrite): {
    readonly subtotalMinor: number;
    readonly totalMinor: number;
  } {
    const subtotalMinor = input.items.reduce(
      (total, item) =>
        total + item.quantity * item.unitCostMinor - item.discountMinor + item.taxMinor,
      0
    );
    return {
      subtotalMinor,
      totalMinor:
        subtotalMinor -
        input.discountMinor +
        input.taxMinor +
        input.freightMinor +
        input.otherChargesMinor
    };
  }

  private mapPurchase(row: PurchaseRow): PurchaseListItem {
    const metadata = this.decodeMetadata(row.metadataJson);
    const balanceMinor = Math.max(0, row.totalMinor - row.paidMinor);
    return {
      id: row.id,
      purchaseNumber: row.purchaseNumber,
      invoiceNumber: metadata.invoiceNumber,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      purchaseDate: row.purchaseDate,
      dueDate: metadata.dueDate,
      itemCount: row.itemCount,
      totalMinor: row.totalMinor,
      paidMinor: row.paidMinor,
      balanceMinor,
      paymentStatus: row.paidMinor <= 0 ? "unpaid" : balanceMinor <= 0 ? "paid" : "partial",
      status: row.status,
      receivedAt: row.receivedAt,
      cancelledAt: row.cancelledAt,
      updatedAt: row.updatedAt
    };
  }

  private mapPurchaseDetail(row: PurchaseRow): Omit<PurchaseDetail, "items"> {
    const metadata = this.decodeMetadata(row.metadataJson);
    return {
      ...this.mapPurchase(row),
      subtotalMinor: row.subtotalMinor,
      discountMinor: row.discountMinor,
      taxMinor: row.taxMinor,
      freightMinor: metadata.freightMinor,
      otherChargesMinor: metadata.otherChargesMinor,
      notes: metadata.notes,
      createdAt: row.createdAt,
      createdByUserId: row.createdByUserId
    };
  }

  private getRequiredPurchase(id: string): CoreResult<PurchaseDetail> {
    const purchase = this.getPurchase(id);
    if (!purchase.ok) return purchase;
    return purchase.value === undefined
      ? err(repositoryError("REPOSITORY_NOT_FOUND", "Purchase was not found"))
      : ok(purchase.value);
  }

  private metadataFromInput(input: PurchaseWrite): PurchaseMetadata {
    return {
      invoiceNumber: input.invoiceNumber ?? null,
      dueDate: input.dueDate ?? null,
      freightMinor: input.freightMinor,
      otherChargesMinor: input.otherChargesMinor,
      notes: input.notes ?? null,
      cancellationReason: null
    };
  }

  private encodeMetadata(metadata: PurchaseMetadata): string {
    return JSON.stringify(metadata);
  }

  private decodeMetadata(value: string | null): PurchaseMetadata {
    if (value === null || value.trim().length === 0) return defaultMetadata;
    try {
      const parsed = JSON.parse(value) as Partial<PurchaseMetadata>;
      return {
        invoiceNumber: typeof parsed.invoiceNumber === "string" ? parsed.invoiceNumber : null,
        dueDate: typeof parsed.dueDate === "string" ? parsed.dueDate : null,
        freightMinor: typeof parsed.freightMinor === "number" ? parsed.freightMinor : 0,
        otherChargesMinor:
          typeof parsed.otherChargesMinor === "number" ? parsed.otherChargesMinor : 0,
        notes: typeof parsed.notes === "string" ? parsed.notes : null,
        cancellationReason:
          typeof parsed.cancellationReason === "string" ? parsed.cancellationReason : null
      };
    } catch {
      return { ...defaultMetadata, notes: value };
    }
  }

  private ensureLedgerAccounts(
    storeId: string,
    userId: string
  ): { readonly inventoryAccountId: string; readonly payableAccountId: string } {
    const timestamp = new Date().toISOString();
    return {
      inventoryAccountId: this.ensureLedgerAccount(
        storeId,
        "1200",
        "Inventory Asset",
        "asset",
        userId,
        timestamp
      ),
      payableAccountId: this.ensureLedgerAccount(
        storeId,
        "2000",
        "Supplier Payables",
        "liability",
        userId,
        timestamp
      )
    };
  }

  private postReturnLedger(
    purchase: PurchaseDetail,
    input: PurchaseReturnWrite,
    returnId: string,
    totalValueMinor: number,
    timestamp: string
  ): void {
    const accounts = this.ensureLedgerAccounts(input.storeId, input.userId);
    const ledgerTransactionId = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_transactions (
          id, store_id, branch_id, business_day_id, source_type, source_id,
          transaction_type, status, posted_at, posted_by_user_id, memo, created_at
        ) VALUES (?, ?, ?, ?, 'purchase_return', ?, 'purchase-return', 'posted', ?, ?, ?, ?)`
      )
      .run(
        ledgerTransactionId,
        input.storeId,
        input.branchId,
        input.businessDayId,
        returnId,
        timestamp,
        input.userId,
        `Purchase return ${purchase.purchaseNumber}`,
        timestamp
      );
    this.insertLedgerEntry(
      ledgerTransactionId,
      accounts.payableAccountId,
      "liability",
      "supplier",
      purchase.supplierId,
      totalValueMinor,
      0,
      "Supplier payable reduced"
    );
    this.insertLedgerEntry(
      ledgerTransactionId,
      accounts.inventoryAccountId,
      "asset",
      null,
      null,
      0,
      totalValueMinor,
      "Inventory returned to supplier"
    );
  }

  private ensureLedgerAccount(
    storeId: string,
    code: string,
    name: string,
    accountType: string,
    userId: string,
    timestamp: string
  ): string {
    const existing = this.connection.sqlite
      .prepare("SELECT id FROM ledger_accounts WHERE store_id = ? AND code = ? LIMIT 1")
      .get(storeId, code) as IdRow | undefined;
    if (existing !== undefined) return existing.id;
    const id = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_accounts (id, store_id, code, name, account_type, status, created_at, updated_at, created_by_user_id, updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
      )
      .run(id, storeId, code, name, accountType, timestamp, timestamp, userId, userId);
    return id;
  }

  private insertLedgerEntry(
    ledgerTransactionId: string,
    ledgerAccountId: string,
    accountType: string,
    accountRefType: string | null,
    accountRefId: string | null,
    debitMinor: number,
    creditMinor: number,
    memo: string
  ): void {
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_entries (
          id, ledger_transaction_id, ledger_account_id, entry_type, account_type,
          account_ref_type, account_ref_id, debit_minor, credit_minor, currency_code, memo, created_at
        ) VALUES (?, ?, ?, 'normal', ?, ?, ?, ?, ?, 'PKR', ?, ?)`
      )
      .run(
        randomUUID(),
        ledgerTransactionId,
        ledgerAccountId,
        accountType,
        accountRefType,
        accountRefId,
        debitMinor,
        creditMinor,
        memo,
        new Date().toISOString()
      );
  }

  private nextPurchaseNumber(branchId: string): string {
    const row = this.connection.sqlite
      .prepare("SELECT COUNT(*) AS count FROM purchases WHERE branch_id = ?")
      .get(branchId) as CountRow;
    return `PO-${String(row.count + 1).padStart(6, "0")}`;
  }

  private nextPurchaseReturnNumber(branchId: string): string {
    const row = this.connection.sqlite
      .prepare("SELECT COUNT(*) AS count FROM purchase_returns WHERE branch_id = ?")
      .get(branchId) as CountRow;
    return `PR-${String(row.count + 1).padStart(6, "0")}`;
  }

  private currentStock(productId: string): number {
    return (
      (
        this.connection.sqlite
          .prepare(
            `SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END), 0) AS amount
               FROM inventory_transactions
              WHERE product_id = ? AND status = 'posted'`
          )
          .get(productId) as MoneyRow | undefined
      )?.amount ?? 0
    );
  }

  private writeAudit(
    input: {
      readonly storeId: string;
      readonly branchId: string;
      readonly businessDayId: string;
      readonly userId: string;
    },
    action: string,
    targetId: string,
    metadata: Readonly<Record<string, unknown>>
  ): void {
    const timestamp = new Date().toISOString();
    this.connection.sqlite
      .prepare(
        `INSERT INTO audit_logs (
          id, store_id, branch_id, business_day_id, actor_user_id, action,
          target_type, target_id, metadata_json, occurred_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'purchase', ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        input.storeId,
        input.branchId,
        input.businessDayId,
        input.userId,
        action,
        targetId,
        JSON.stringify(metadata),
        timestamp,
        timestamp
      );
  }
}
