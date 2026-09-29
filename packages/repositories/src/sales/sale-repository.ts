import { refundForQuantity } from "../shared/refund-allocation.js";
import { createHash, randomUUID } from "node:crypto";
import { sales } from "@orix/database";
import type { CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";
import { repositoryError } from "../shared/repository-error.js";

export type SaleStatusFilter = "draft" | "held" | "completed" | "cancelled" | "all";
export type SaleSortBy = "saleNumber" | "saleDate" | "customer" | "total" | "status" | "createdAt";
export type SalePaymentType = "cash" | "credit" | "mixed";
export type SaleReturnRefundMethod = "cash" | "customer-credit";
export type SaleReturnCondition = "sellable" | "damaged";

export type SaleItemWrite = {
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
};

export type SaleWrite = {
  readonly operationId?: string;
  readonly id?: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly customerId?: string | null;
  readonly saleNumber?: string | null;
  readonly saleDate: string;
  readonly paymentType: SalePaymentType;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly cashReceivedMinor: number;
  readonly notes?: string | null;
  readonly holdReason?: string | null;
  readonly items: readonly SaleItemWrite[];
  readonly expectedUpdatedAt?: string | null;
};

export type CompleteSaleWrite = SaleWrite & {
  readonly id?: string;
};

export type SaleListQuery = {
  readonly storeId: string;
  readonly search?: string;
  readonly customerId?: string;
  readonly status?: SaleStatusFilter;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: SaleSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type SaleMetadata = {
  readonly notes: string | null;
  readonly holdReason: string | null;
  readonly cancellationReason: string | null;
};

export type SaleListItem = {
  readonly returnStatus: "none" | "partial" | "full";
  readonly refundedMinor: number;
  readonly netTotalMinor: number;

  readonly id: string;
  readonly saleNumber: string;
  readonly customerId: string | null;
  readonly customerName: string | null;
  readonly saleDate: string;
  readonly itemCount: number;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly changeDueMinor: number;
  readonly paymentType: SalePaymentType;
  readonly status: "draft" | "held" | "completed" | "cancelled";
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly updatedAt: string | null;
};

export type SaleItem = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly barcode: string | null;
  readonly unitId: string;
  readonly unitName: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly lineTotalMinor: number;
  readonly returnedQuantity: number;
};

export type SaleDetail = SaleListItem & {
  readonly taxMinor: number;
  readonly notes: string | null;
  readonly holdReason: string | null;
  readonly items: readonly SaleItem[];
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly cashierName: string;
};

export type SaleReturnItemWrite = {
  readonly saleItemId: string;
  readonly quantity: number;
  readonly condition: SaleReturnCondition;
};

export type SaleReturnWrite = {
  readonly saleId: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly reason: string;
  readonly refundMethod: SaleReturnRefundMethod;
  readonly items: readonly SaleReturnItemWrite[];
};

export type SaleReturnItem = {
  readonly id: string;
  readonly saleItemId: string;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly condition: SaleReturnCondition;
  readonly restockAction: "return-to-stock" | "do-not-restock";
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
};

export type SaleReturnDetail = {
  readonly id: string;
  readonly returnNumber: string;
  readonly saleId: string;
  readonly saleNumber: string;
  readonly customerId: string | null;
  readonly customerName: string | null;
  readonly reason: string;
  readonly refundMethod: SaleReturnRefundMethod;
  readonly totalRefundMinor: number;
  readonly cashRefundMinor: number;
  readonly receivableReductionMinor: number;
  readonly returnedAt: string;
  readonly items: readonly SaleReturnItem[];
};

export type SalePage = {
  readonly items: readonly SaleListItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type ReceiptLineItem = {
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
};

export type ReceiptModel = {
  readonly saleId: string;
  readonly saleNumber: string;
  readonly saleDate: string;
  readonly cashierName: string;
  readonly customerName: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly changeDueMinor: number;
  readonly paymentType: SalePaymentType;
  readonly items: readonly ReceiptLineItem[];
};

export type CashRegisterSummary = {
  readonly openingCashMinor: number;
  readonly cashSalesMinor: number;
  readonly customerPaymentsMinor: number;
  readonly expensesMinor: number;
  readonly expectedCashMinor: number;
  readonly salesCount: number;
  readonly averageSaleMinor: number;
};

export type SalesDashboardSummary = {
  readonly todayRevenueMinor: number;
  readonly todayProfitMinor: number | null;
  readonly salesCount: number;
  readonly averageSaleMinor: number;
  readonly bestSellingProducts: readonly {
    readonly productId: string;
    readonly productName: string;
    readonly quantity: number;
    readonly revenueMinor: number;
  }[];
  readonly bestCustomers: readonly {
    readonly customerId: string;
    readonly customerName: string;
    readonly revenueMinor: number;
  }[];
  readonly recentSales: readonly SaleListItem[];
};

type SaleRow = {
  readonly returnStatus: "none" | "partial" | "full";
  readonly refundedMinor: number;
  readonly netTotalMinor: number;

  readonly id: string;
  readonly saleNumber: string;
  readonly customerId: string | null;
  readonly customerName: string | null;
  readonly saleType: SalePaymentType;
  readonly status: "draft" | "held" | "completed" | "cancelled";
  readonly saleDate: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly changeDueMinor: number | null;
  readonly metadataJson: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly createdByUserId: string;
  readonly cashierName: string | null;
  readonly itemCount: number;
};

type SaleItemRow = {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly barcode: string | null;
  readonly unitId: string;
  readonly unitName: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number | null;
  readonly taxMinor: number | null;
  readonly lineTotalMinor: number;
  readonly returnedQuantity: number | null;
};

type ProductValidationRow = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly archivedAt: string | null;
  readonly isStockTracked: number;
  readonly currentStock: number | null;
};

type CountRow = { readonly count: number };
type MoneyRow = { readonly amount: number | null };
type IdRow = { readonly id: string };
type SaleReturnRow = Omit<SaleReturnDetail, "items">;
type SaleReturnItemRow = SaleReturnItem;

const defaultMetadata: SaleMetadata = {
  notes: null,
  holdReason: null,
  cancellationReason: null
};

export class SaleRepository extends BaseRepository<typeof sales> {
  private readonly connection: RepositoryConnection;

  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: sales,
      tableName: "sales",
      searchableColumns: [sales.saleNumber],
      documentNumberColumn: sales.saleNumber,
      dateColumn: sales.saleDate,
      sortableColumns: {
        saleNumber: sales.saleNumber,
        saleDate: sales.saleDate,
        createdAt: sales.createdAt,
        status: sales.status,
        totalMinor: sales.totalMinor
      }
    });
    this.connection = connection;
  }

  public listSales(query: SaleListQuery): CoreResult<SalePage> {
    try {
      const page = Math.max(1, query.page);
      const pageSize = Math.max(1, query.pageSize);
      const where = this.saleWhere(query);
      const totalItems = (
        this.connection.sqlite
          .prepare(`SELECT COUNT(*) AS count FROM (${this.saleBaseSql()} ${where.sql})`)
          .get(...where.params) as CountRow
      ).count;
      const rows = this.connection.sqlite
        .prepare(`${this.saleBaseSql()} ${where.sql} ${this.saleOrder(query)} LIMIT ? OFFSET ?`)
        .all(...where.params, pageSize, (page - 1) * pageSize) as SaleRow[];
      return ok({
        items: rows.map((row) => this.mapSale(row)),
        totalItems,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to list sales", cause));
    }
  }

  public getSale(id: string): CoreResult<SaleDetail | undefined> {
    try {
      const row = this.connection.sqlite
        .prepare(`${this.saleBaseSql()} WHERE s.id = ? LIMIT 1`)
        .get(id) as SaleRow | undefined;
      if (row === undefined) return ok(undefined);
      const items = this.loadItems(id);
      if (!items.ok) return items;
      return ok({ ...this.mapSaleDetail(row), items: items.value });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load sale", cause));
    }
  }

  public completedOperation(input: SaleWrite): CoreResult<SaleDetail | undefined> {
    if (input.operationId === undefined) return ok(undefined);
    const existing = this.connection.sqlite
      .prepare(
        "SELECT id, client_operation_hash AS hash FROM sales WHERE store_id = ? AND client_operation_id = ? AND status = 'completed'"
      )
      .get(input.storeId, input.operationId) as { id: string; hash: string } | undefined;
    if (existing === undefined) return ok(undefined);
    if (existing.hash !== this.operationHash(input))
      return err(
        repositoryError(
          "REPOSITORY_CONFLICT",
          "This checkout was already completed with different details. Open Sales History before making another sale."
        )
      );
    return this.getSale(existing.id);
  }

  private operationHash(input: SaleWrite): string {
    return createHash("sha256")
      .update(
        JSON.stringify({
          id: input.id ?? null,
          customerId: input.customerId ?? null,
          saleDate: input.saleDate,
          paymentType: input.paymentType,
          discountMinor: input.discountMinor,
          taxMinor: input.taxMinor,
          cashReceivedMinor: input.cashReceivedMinor,
          items: input.items.map((item) => [
            item.productId,
            item.unitId,
            item.quantity,
            item.unitPriceMinor,
            item.discountMinor,
            item.taxMinor
          ])
        })
      )
      .digest("hex");
  }

  public saveDraft(input: SaleWrite, status: "draft" | "held"): CoreResult<SaleDetail> {
    return input.id === undefined
      ? this.createSale(input, status)
      : this.updateDraft({ ...input, id: input.id }, status);
  }

  public completeSale(input: CompleteSaleWrite): CoreResult<SaleDetail> {
    try {
      const draft =
        input.id === undefined
          ? this.createSale(input, "draft")
          : this.updateDraft({ ...input, id: input.id }, "draft");
      if (!draft.ok) return draft;
      if (input.operationId !== undefined)
        this.connection.sqlite
          .prepare(
            "UPDATE sales SET client_operation_id = ?, client_operation_hash = ? WHERE id = ?"
          )
          .run(input.operationId, this.operationHash(input), draft.value.id);
      const validation = this.validateProductsForCompletion(draft.value.items);
      if (!validation.ok) return validation;
      const timestamp = new Date().toISOString();
      const paidMinor =
        input.paymentType === "credit" ? input.cashReceivedMinor : input.cashReceivedMinor;
      const changeDueMinor = Math.max(0, paidMinor - draft.value.totalMinor);
      this.connection.sqlite
        .prepare(
          `UPDATE sales
              SET status = 'completed', sale_type = ?, paid_minor = ?, change_due_minor = ?,
                  completed_at = ?, completed_by_user_id = ?, updated_at = ?
            WHERE id = ?`
        )
        .run(
          input.paymentType,
          Math.min(paidMinor, draft.value.totalMinor),
          changeDueMinor,
          timestamp,
          input.userId,
          timestamp,
          draft.value.id
        );
      for (const item of draft.value.items) {
        this.connection.sqlite
          .prepare(
            `INSERT INTO inventory_transactions (
              id, store_id, branch_id, business_day_id, product_id, source_type, source_id,
              movement_type, direction, quantity, unit_cost_minor, reason, status,
              posted_at, posted_by_user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, 'sale', ?, 'sale-completed', 'out', ?, NULL, 'sale-completed', 'posted', ?, ?, ?)`
          )
          .run(
            randomUUID(),
            input.storeId,
            input.branchId,
            input.businessDayId,
            item.productId,
            draft.value.id,
            item.quantity,
            timestamp,
            input.userId,
            timestamp
          );
      }
      this.postLedger(draft.value, input, timestamp);
      this.writeAudit(input, "SaleCompleted", draft.value.id, {
        saleNumber: draft.value.saleNumber,
        totalMinor: draft.value.totalMinor
      });
      return this.getRequiredSale(draft.value.id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to complete sale", cause));
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
      const existing = this.getSale(input.id);
      if (!existing.ok) return existing;
      if (existing.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Sale was not found"));
      }
      if (existing.value.status !== "draft" && existing.value.status !== "held") {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Only draft or held sales can be cancelled")
        );
      }
      const timestamp = new Date().toISOString();
      const metadata = this.decodeMetadata(existing.value.notes);
      this.connection.sqlite
        .prepare(
          `UPDATE sales
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
      this.writeAudit(input, "SaleCancelled", input.id, { reason: input.reason });
      return ok(undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to cancel sale", cause));
    }
  }

  public returnSale(input: SaleReturnWrite): CoreResult<SaleReturnDetail> {
    try {
      const sale = this.getSale(input.saleId);
      if (!sale.ok) return sale;
      if (sale.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Sale was not found"));
      }
      if (sale.value.status !== "completed") {
        return err(repositoryError("REPOSITORY_CONFLICT", "Only completed sales can be returned"));
      }
      if (input.refundMethod === "customer-credit" && sale.value.customerId === null) {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Customer credit return requires a customer sale")
        );
      }
      const originalDocument = sale.value;
      const byItem = new Map(sale.value.items.map((item) => [item.id, item]));
      const lines = input.items
        .map((item) => {
          const original = byItem.get(item.saleItemId);
          if (original === undefined) return undefined;
          const available = original.quantity - original.returnedQuantity;
          return { requested: item, original, available };
        })
        .filter((line): line is NonNullable<typeof line> => line !== undefined);
      if (
        lines.length !== input.items.length ||
        lines.length === 0 ||
        new Set(input.items.map((item) => item.saleItemId)).size !== input.items.length
      ) {
        return err(repositoryError("REPOSITORY_CONFLICT", "Return contains invalid sale items"));
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
      }
      const timestamp = new Date().toISOString();
      const returnId = randomUUID();
      const returnNumber = this.nextSaleReturnNumber(input.branchId);
      const totalRefundMinor = lines.reduce(
        (total, line) =>
          total +
          refundForQuantity(
            originalDocument.totalMinor,
            originalDocument.items,
            line.original.id,
            line.requested.quantity
          ),
        0
      );
      const previousCashRefunds = this.money(
        "SELECT COALESCE(SUM(cash_refund_minor),0) AS amount FROM sales_returns WHERE original_sale_id=? AND status='posted'",
        originalDocument.id
      );
      if (
        input.refundMethod === "cash" &&
        totalRefundMinor > originalDocument.paidMinor - previousCashRefunds
      ) {
        return err(
          repositoryError(
            "REPOSITORY_CONFLICT",
            "Cash refund exceeds cash collected on this sale. Use customer credit for the unpaid portion."
          )
        );
      }
      const cashRefundMinor = input.refundMethod === "cash" ? totalRefundMinor : 0;
      const receivableReductionMinor =
        input.refundMethod === "customer-credit" ? totalRefundMinor : 0;
      this.connection.sqlite
        .prepare(
          `INSERT INTO sales_returns (
            id, store_id, branch_id, business_day_id, original_sale_id, customer_id,
            return_number, status, reason, refund_method, total_refund_minor, cash_refund_minor,
            receivable_reduction_minor, returned_at, created_at, updated_at, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          returnId,
          input.storeId,
          input.branchId,
          input.businessDayId,
          sale.value.id,
          sale.value.customerId,
          returnNumber,
          input.reason.trim(),
          input.refundMethod,
          totalRefundMinor,
          cashRefundMinor,
          receivableReductionMinor,
          timestamp,
          timestamp,
          timestamp,
          input.userId
        );
      for (const line of lines) {
        const restockAction =
          line.requested.condition === "sellable" ? "return-to-stock" : "do-not-restock";
        const lineTotalMinor = refundForQuantity(
          originalDocument.totalMinor,
          originalDocument.items,
          line.original.id,
          line.requested.quantity
        );
        this.connection.sqlite
          .prepare(
            `INSERT INTO sales_return_items (
              id, sales_return_id, sale_item_id, product_id, quantity, condition, restock_action,
              unit_price_minor, line_total_minor, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            randomUUID(),
            returnId,
            line.original.id,
            line.original.productId,
            line.requested.quantity,
            line.requested.condition,
            restockAction,
            line.original.unitPriceMinor,
            lineTotalMinor,
            timestamp
          );
        this.connection.sqlite
          .prepare(
            `UPDATE sale_items
                SET returned_quantity = COALESCE(returned_quantity, 0) + ?, updated_at = ?
              WHERE id = ?`
          )
          .run(line.requested.quantity, timestamp, line.original.id);
        if (restockAction === "return-to-stock") {
          this.connection.sqlite
            .prepare(
              `INSERT INTO inventory_transactions (
                id, store_id, branch_id, business_day_id, product_id, source_type, source_id,
                movement_type, direction, quantity, unit_cost_minor, reason, status,
                posted_at, posted_by_user_id, created_at
              ) VALUES (?, ?, ?, ?, ?, 'sales_return', ?, 'sale-return', 'in', ?, NULL, ?, 'posted', ?, ?, ?)`
            )
            .run(
              randomUUID(),
              input.storeId,
              input.branchId,
              input.businessDayId,
              line.original.productId,
              returnId,
              line.requested.quantity,
              input.reason.trim(),
              timestamp,
              input.userId,
              timestamp
            );
        }
      }
      const remaining = (
        this.connection.sqlite
          .prepare(
            `SELECT COUNT(*) AS count
               FROM sale_items
              WHERE sale_id = ? AND COALESCE(returned_quantity, 0) < quantity`
          )
          .get(sale.value.id) as CountRow
      ).count;
      if (remaining === 0) {
        this.connection.sqlite
          .prepare("UPDATE sales SET returned_at = ?, updated_at = ? WHERE id = ?")
          .run(timestamp, timestamp, sale.value.id);
      }
      this.postReturnLedger(sale.value, input, returnId, totalRefundMinor, timestamp);
      this.writeAudit(input, "SaleReturned", returnId, {
        saleId: sale.value.id,
        saleNumber: sale.value.saleNumber,
        returnNumber,
        totalRefundMinor,
        reason: input.reason.trim()
      });
      const created = this.getSaleReturn(returnId);
      return created.ok && created.value !== undefined
        ? ok(created.value)
        : err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load sale return"));
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to return sale", cause));
    }
  }

  public getSaleReturn(id: string): CoreResult<SaleReturnDetail | undefined> {
    try {
      const row = this.connection.sqlite
        .prepare(
          `SELECT sr.id, sr.return_number AS returnNumber, sr.original_sale_id AS saleId,
                  s.sale_number AS saleNumber, sr.customer_id AS customerId, c.name AS customerName,
                  sr.reason, sr.refund_method AS refundMethod,
                  sr.total_refund_minor AS totalRefundMinor,
                  sr.cash_refund_minor AS cashRefundMinor,
                  sr.receivable_reduction_minor AS receivableReductionMinor,
                  sr.returned_at AS returnedAt
             FROM sales_returns sr
             JOIN sales s ON s.id = sr.original_sale_id
             LEFT JOIN customers c ON c.id = sr.customer_id
            WHERE sr.id = ?
            LIMIT 1`
        )
        .get(id) as SaleReturnRow | undefined;
      if (row === undefined) return ok(undefined);
      const items = this.connection.sqlite
        .prepare(
          `SELECT sri.id, sri.sale_item_id AS saleItemId, sri.product_id AS productId,
                  p.name AS productName, sri.quantity, sri.condition,
                  sri.restock_action AS restockAction, sri.unit_price_minor AS unitPriceMinor,
                  sri.line_total_minor AS lineTotalMinor
             FROM sales_return_items sri
             JOIN products p ON p.id = sri.product_id
            WHERE sri.sales_return_id = ?
            ORDER BY sri.created_at ASC`
        )
        .all(id) as SaleReturnItemRow[];
      return ok({ ...row, items });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load sale return", cause));
    }
  }

  public receipt(saleId: string): CoreResult<ReceiptModel> {
    const sale = this.getSale(saleId);
    if (!sale.ok) return sale;
    if (sale.value === undefined) {
      return err(repositoryError("REPOSITORY_NOT_FOUND", "Sale was not found"));
    }
    return ok({
      saleId: sale.value.id,
      saleNumber: sale.value.saleNumber,
      saleDate: sale.value.completedAt ?? sale.value.saleDate,
      cashierName: sale.value.cashierName,
      customerName: sale.value.customerName ?? "Walk-in Customer",
      subtotalMinor: sale.value.subtotalMinor,
      discountMinor: sale.value.discountMinor,
      totalMinor: sale.value.totalMinor,
      paidMinor: sale.value.paidMinor,
      changeDueMinor: sale.value.changeDueMinor,
      paymentType: sale.value.paymentType,
      items: sale.value.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        lineTotalMinor: item.lineTotalMinor
      }))
    });
  }

  public cashRegisterSummary(businessDayId: string): CoreResult<CashRegisterSummary> {
    try {
      const cashSalesMinor = this.money(
        "SELECT COALESCE(SUM(paid_minor), 0) AS amount FROM sales WHERE business_day_id = ? AND status = 'completed' AND sale_type IN ('cash', 'mixed')",
        businessDayId
      );
      const customerPaymentsMinor = this.money(
        "SELECT COALESCE(SUM(cp.amount_minor), 0) AS amount FROM customer_payments cp JOIN payment_methods pm ON pm.id=cp.payment_method_id WHERE cp.business_day_id = ? AND cp.status = 'recorded' AND pm.method_type='cash'",
        businessDayId
      );
      const expensesMinor = this.money(
        "SELECT COALESCE(SUM(amount_minor), 0) AS amount FROM expenses WHERE business_day_id = ? AND status = 'recorded'",
        businessDayId
      );
      const salesCount = (
        this.connection.sqlite
          .prepare(
            "SELECT COUNT(*) AS count FROM sales WHERE business_day_id = ? AND status = 'completed'"
          )
          .get(businessDayId) as CountRow
      ).count;
      const openingCashMinor = this.money(
        "SELECT COALESCE(SUM(opening_cash_minor), 0) AS amount FROM cash_sessions WHERE business_day_id = ?",
        businessDayId
      );
      const movementMinor = this.money(
        `SELECT COALESCE(SUM(le.debit_minor - le.credit_minor), 0) AS amount
        FROM ledger_entries le JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
        WHERE lt.business_day_id = ? AND lt.status = 'posted' AND le.account_type = 'cash'`,
        businessDayId
      );
      return ok({
        openingCashMinor,
        cashSalesMinor,
        customerPaymentsMinor,
        expensesMinor,
        expectedCashMinor: openingCashMinor + movementMinor,
        salesCount,
        averageSaleMinor: salesCount === 0 ? 0 : Math.round(cashSalesMinor / salesCount)
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load cash register", cause));
    }
  }

  public dashboardSummary(
    storeId: string,
    businessDayId: string
  ): CoreResult<SalesDashboardSummary> {
    try {
      const todayRevenueMinor = this.money(
        "SELECT (SELECT COALESCE(SUM(total_minor),0) FROM sales WHERE business_day_id=? AND status='completed') - (SELECT COALESCE(SUM(total_refund_minor),0) FROM sales_returns WHERE business_day_id=? AND status='posted') AS amount",
        businessDayId,
        businessDayId
      );
      const salesCount = (
        this.connection.sqlite
          .prepare(
            "SELECT COUNT(*) AS count FROM sales WHERE business_day_id = ? AND status = 'completed'"
          )
          .get(businessDayId) as CountRow
      ).count;
      const rankingRows = this.connection.sqlite
        .prepare(
          `SELECT s.id AS saleId, s.total_minor AS totalMinor, si.id, si.product_id AS productId,
                p.name AS productName, si.quantity, COALESCE(si.returned_quantity,0) AS returnedQuantity,
                si.line_total_minor AS lineTotalMinor
           FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN products p ON p.id=si.product_id
          WHERE s.store_id=? AND s.business_day_id=? AND s.status='completed'
          ORDER BY s.id, si.created_at, si.rowid`
        )
        .all(storeId, businessDayId) as {
        saleId: string;
        totalMinor: number;
        id: string;
        productId: string;
        productName: string;
        quantity: number;
        returnedQuantity: number;
        lineTotalMinor: number;
      }[];
      const documents = new Map<string, typeof rankingRows>();
      for (const row of rankingRows) {
        const lines = documents.get(row.saleId) ?? [];
        lines.push(row);
        documents.set(row.saleId, lines);
      }
      const productTotals = new Map<
        string,
        { productId: string; productName: string; quantity: number; revenueMinor: number }
      >();
      for (const lines of documents.values()) {
        for (const line of lines) {
          const remaining = line.quantity - line.returnedQuantity;
          const product = productTotals.get(line.productId) ?? {
            productId: line.productId,
            productName: line.productName,
            quantity: 0,
            revenueMinor: 0
          };
          product.quantity += remaining;
          product.revenueMinor +=
            remaining > 0 ? refundForQuantity(line.totalMinor, lines, line.id, remaining) : 0;
          productTotals.set(line.productId, product);
        }
      }
      const bestSellingProducts = [...productTotals.values()]
        .filter((product) => product.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8);
      const bestCustomers = this.connection.sqlite
        .prepare(
          `SELECT c.id AS customerId, c.name AS customerName, SUM(s.total_minor - COALESCE((SELECT SUM(r.total_refund_minor) FROM sales_returns r WHERE r.original_sale_id=s.id AND r.status='posted'),0)) AS revenueMinor
             FROM sales s
             JOIN customers c ON c.id = s.customer_id
            WHERE s.store_id = ? AND s.business_day_id = ? AND s.status = 'completed'
            GROUP BY c.id
            ORDER BY revenueMinor DESC
            LIMIT 8`
        )
        .all(storeId, businessDayId) as SalesDashboardSummary["bestCustomers"];
      const recent = this.listSales({
        storeId,
        status: "completed",
        page: 1,
        pageSize: 8,
        sortBy: "saleDate",
        sortDirection: "desc"
      });
      if (!recent.ok) return recent;
      return ok({
        todayRevenueMinor,
        todayProfitMinor: null,
        salesCount,
        averageSaleMinor: salesCount === 0 ? 0 : Math.round(todayRevenueMinor / salesCount),
        bestSellingProducts,
        bestCustomers,
        recentSales: recent.value.items
      });
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_READ_FAILED", "Failed to load sales dashboard", cause)
      );
    }
  }

  private createSale(input: SaleWrite, status: "draft" | "held"): CoreResult<SaleDetail> {
    try {
      const id = randomUUID();
      const timestamp = new Date().toISOString();
      const totals = this.calculateTotals(input);
      const requestedSaleNumber = input.saleNumber?.trim();
      const saleNumber =
        requestedSaleNumber !== undefined && requestedSaleNumber.length > 0
          ? requestedSaleNumber
          : this.nextSaleNumber(input.branchId);
      this.connection.sqlite
        .prepare(
          `INSERT INTO sales (
            id, store_id, branch_id, business_day_id, customer_id, sale_number, sale_type,
            status, sale_date, subtotal_minor, discount_minor, tax_minor, total_minor,
            paid_minor, change_due_minor, cancellation_reason, created_at, updated_at,
            created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.storeId,
          input.branchId,
          input.businessDayId,
          input.customerId ?? null,
          saleNumber,
          input.paymentType,
          status,
          input.saleDate,
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
      this.writeAudit(input, status === "held" ? "SaleHeld" : "SaleCreated", id, {
        saleNumber,
        totalMinor: totals.totalMinor
      });
      return this.getRequiredSale(id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create sale", cause));
    }
  }

  private updateDraft(
    input: SaleWrite & { readonly id: string },
    status: "draft" | "held"
  ): CoreResult<SaleDetail> {
    try {
      const existing = this.getSale(input.id);
      if (!existing.ok) return existing;
      if (existing.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Sale was not found"));
      }
      if (existing.value.status !== "draft" && existing.value.status !== "held") {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Only draft or held sales can be edited")
        );
      }
      if (
        input.expectedUpdatedAt !== undefined &&
        existing.value.updatedAt !== input.expectedUpdatedAt
      ) {
        return err(repositoryError("REPOSITORY_CONFLICT", "Sale was changed by another action"));
      }
      const timestamp = new Date().toISOString();
      const totals = this.calculateTotals(input);
      this.connection.sqlite
        .prepare(
          `UPDATE sales
              SET customer_id = ?, sale_type = ?, status = ?, sale_date = ?, subtotal_minor = ?,
                  discount_minor = ?, tax_minor = ?, total_minor = ?, cancellation_reason = ?,
                  updated_at = ?
            WHERE id = ?`
        )
        .run(
          input.customerId ?? null,
          input.paymentType,
          status,
          input.saleDate,
          totals.subtotalMinor,
          input.discountMinor,
          input.taxMinor,
          totals.totalMinor,
          this.encodeMetadata(this.metadataFromInput(input)),
          timestamp,
          input.id
        );
      this.connection.sqlite.prepare("DELETE FROM sale_items WHERE sale_id = ?").run(input.id);
      this.replaceItems(input.id, input.items, timestamp);
      this.writeAudit(input, status === "held" ? "SaleHeld" : "SaleUpdated", input.id, {
        totalMinor: totals.totalMinor
      });
      return this.getRequiredSale(input.id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update sale", cause));
    }
  }

  private validateProductsForCompletion(items: readonly SaleItem[]): CoreResult<void> {
    for (const item of items) {
      const product = this.connection.sqlite
        .prepare(
          `SELECT p.id, p.name, p.status, p.archived_at AS archivedAt,
                  p.is_stock_tracked AS isStockTracked,
                  COALESCE(stock.currentStock, 0) AS currentStock
             FROM products p
             LEFT JOIN (
               SELECT product_id,
                      SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END) AS currentStock
                 FROM inventory_transactions
                WHERE status = 'posted'
                GROUP BY product_id
             ) stock ON stock.product_id = p.id
            WHERE p.id = ?`
        )
        .get(item.productId) as ProductValidationRow | undefined;
      if (product?.archivedAt !== null || product.status !== "active") {
        return err(repositoryError("REPOSITORY_CONFLICT", `${item.productName} is not active.`));
      }
      if (product.isStockTracked === 1 && (product.currentStock ?? 0) < item.quantity) {
        return err(
          repositoryError("REPOSITORY_CONFLICT", `${item.productName} has insufficient stock.`)
        );
      }
    }
    return ok(undefined);
  }

  private postLedger(sale: SaleDetail, input: CompleteSaleWrite, timestamp: string): void {
    const accounts = this.ensureLedgerAccounts(input.storeId, input.userId);
    const transactionId = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_transactions (
          id, store_id, branch_id, business_day_id, source_type, source_id,
          transaction_type, status, posted_at, posted_by_user_id, memo, created_at
        ) VALUES (?, ?, ?, ?, 'sale', ?, 'sale', 'posted', ?, ?, ?, ?)`
      )
      .run(
        transactionId,
        input.storeId,
        input.branchId,
        input.businessDayId,
        sale.id,
        timestamp,
        input.userId,
        `Sale ${sale.saleNumber}`,
        timestamp
      );
    if (input.paymentType === "credit") {
      this.insertLedgerEntry(
        transactionId,
        accounts.receivableAccountId,
        "receivable",
        "customer",
        input.customerId ?? null,
        sale.totalMinor,
        0,
        "Credit sale"
      );
    } else if (input.paymentType === "mixed") {
      const cashMinor = Math.min(input.cashReceivedMinor, sale.totalMinor);
      const receivableMinor = sale.totalMinor - cashMinor;
      this.insertLedgerEntry(
        transactionId,
        accounts.cashAccountId,
        "cash",
        null,
        null,
        cashMinor,
        0,
        "Mixed sale cash portion"
      );
      this.insertLedgerEntry(
        transactionId,
        accounts.receivableAccountId,
        "receivable",
        "customer",
        input.customerId ?? null,
        receivableMinor,
        0,
        "Mixed sale credit portion"
      );
    } else {
      this.insertLedgerEntry(
        transactionId,
        accounts.cashAccountId,
        "cash",
        null,
        null,
        sale.totalMinor,
        0,
        "Cash sale"
      );
    }
    this.insertLedgerEntry(
      transactionId,
      accounts.revenueAccountId,
      "income",
      null,
      null,
      0,
      sale.totalMinor,
      "Sales revenue"
    );
  }

  private postReturnLedger(
    sale: SaleDetail,
    input: SaleReturnWrite,
    returnId: string,
    totalRefundMinor: number,
    timestamp: string
  ): void {
    const accounts = this.ensureLedgerAccounts(input.storeId, input.userId);
    const transactionId = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_transactions (
          id, store_id, branch_id, business_day_id, source_type, source_id,
          transaction_type, status, posted_at, posted_by_user_id, memo, created_at
        ) VALUES (?, ?, ?, ?, 'sales_return', ?, 'sales-return', 'posted', ?, ?, ?, ?)`
      )
      .run(
        transactionId,
        input.storeId,
        input.branchId,
        input.businessDayId,
        returnId,
        timestamp,
        input.userId,
        `Sales return ${sale.saleNumber}`,
        timestamp
      );
    this.insertLedgerEntry(
      transactionId,
      accounts.revenueAccountId,
      "income",
      null,
      null,
      totalRefundMinor,
      0,
      "Sales return"
    );
    const creditAccount =
      input.refundMethod === "cash" ? accounts.cashAccountId : accounts.receivableAccountId;
    this.insertLedgerEntry(
      transactionId,
      creditAccount,
      input.refundMethod === "cash" ? "cash" : "receivable",
      input.refundMethod === "cash" ? null : "customer",
      input.refundMethod === "cash" ? null : sale.customerId,
      0,
      totalRefundMinor,
      input.refundMethod === "cash" ? "Cash refund" : "Customer receivable reduced"
    );
  }

  private saleBaseSql(): string {
    return `
      SELECT s.id, s.sale_number AS saleNumber, s.customer_id AS customerId,
             c.name AS customerName, s.sale_type AS saleType, s.status, s.sale_date AS saleDate,
             s.subtotal_minor AS subtotalMinor, s.discount_minor AS discountMinor,
             s.tax_minor AS taxMinor, s.total_minor AS totalMinor, s.paid_minor AS paidMinor,
             COALESCE(s.change_due_minor, 0) AS changeDueMinor,
             s.cancellation_reason AS metadataJson, s.completed_at AS completedAt,
             s.cancelled_at AS cancelledAt, s.created_at AS createdAt, s.updated_at AS updatedAt,
             s.created_by_user_id AS createdByUserId, u.display_name AS cashierName,
             COALESCE(items.itemCount, 0) AS itemCount,
             CASE WHEN COALESCE(items.returnedCount, 0) = 0 THEN 'none'
                  WHEN items.remainingCount = 0 THEN 'full' ELSE 'partial' END AS returnStatus,
             COALESCE(refunds.refundedMinor, 0) AS refundedMinor,
             s.total_minor - COALESCE(refunds.refundedMinor, 0) AS netTotalMinor
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        LEFT JOIN users u ON u.id = s.created_by_user_id
        LEFT JOIN (
          SELECT sale_id, COUNT(*) AS itemCount, SUM(CASE WHEN COALESCE(returned_quantity,0)>0 THEN 1 ELSE 0 END) AS returnedCount, SUM(CASE WHEN COALESCE(returned_quantity,0)<quantity THEN 1 ELSE 0 END) AS remainingCount
            FROM sale_items
           GROUP BY sale_id
        ) items ON items.sale_id = s.id
        LEFT JOIN (SELECT original_sale_id, SUM(total_refund_minor) AS refundedMinor
                     FROM sales_returns WHERE status='posted' GROUP BY original_sale_id
                  ) refunds ON refunds.original_sale_id = s.id`;
  }

  private saleWhere(query: SaleListQuery): {
    readonly sql: string;
    readonly params: readonly unknown[];
  } {
    const clauses = ["s.store_id = ?"];
    const params: unknown[] = [query.storeId];
    if (query.status !== undefined && query.status !== "all") {
      clauses.push("s.status = ?");
      params.push(query.status);
    }
    if (query.customerId !== undefined && query.customerId.length > 0) {
      clauses.push("s.customer_id = ?");
      params.push(query.customerId);
    }
    if (query.dateFrom !== undefined && query.dateFrom.length > 0) {
      clauses.push("s.sale_date >= ?");
      params.push(query.dateFrom);
    }
    if (query.dateTo !== undefined && query.dateTo.length > 0) {
      clauses.push("s.sale_date <= ?");
      params.push(query.dateTo);
    }
    const search = query.search?.trim().toLowerCase();
    if (search !== undefined && search.length > 0) {
      clauses.push(
        "(lower(s.sale_number) LIKE ? OR lower(COALESCE(c.name, '')) LIKE ? OR lower(COALESCE(s.cancellation_reason, '')) LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private saleOrder(query: SaleListQuery): string {
    const direction = query.sortDirection === "desc" ? "DESC" : "ASC";
    const column: Record<SaleSortBy, string> = {
      saleNumber: "s.sale_number",
      saleDate: "s.sale_date",
      customer: "c.name",
      total: "s.total_minor",
      status: "s.status",
      createdAt: "s.created_at"
    };
    return `ORDER BY ${column[query.sortBy]} ${direction}, s.created_at DESC`;
  }

  private loadItems(saleId: string): CoreResult<readonly SaleItem[]> {
    try {
      const rows = this.connection.sqlite
        .prepare(
          `SELECT si.id, si.product_id AS productId, p.name AS productName, p.barcode,
                  si.unit_id AS unitId, u.name AS unitName, si.quantity,
                  si.unit_price_minor AS unitPriceMinor, si.discount_minor AS discountMinor,
                  si.tax_minor AS taxMinor, si.line_total_minor AS lineTotalMinor,
                  si.returned_quantity AS returnedQuantity
             FROM sale_items si
             JOIN products p ON p.id = si.product_id
             JOIN units u ON u.id = si.unit_id
            WHERE si.sale_id = ?
            ORDER BY si.created_at ASC`
        )
        .all(saleId) as SaleItemRow[];
      return ok(
        rows.map((row) => ({
          id: row.id,
          productId: row.productId,
          productName: row.productName,
          barcode: row.barcode,
          unitId: row.unitId,
          unitName: row.unitName,
          quantity: row.quantity,
          unitPriceMinor: row.unitPriceMinor,
          discountMinor: row.discountMinor ?? 0,
          taxMinor: row.taxMinor ?? 0,
          lineTotalMinor: row.lineTotalMinor,
          returnedQuantity: row.returnedQuantity ?? 0
        }))
      );
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load sale items", cause));
    }
  }

  private replaceItems(saleId: string, items: readonly SaleItemWrite[], timestamp: string): void {
    for (const item of items) {
      const lineTotalMinor =
        item.quantity * item.unitPriceMinor - item.discountMinor + item.taxMinor;
      this.connection.sqlite
        .prepare(
          `INSERT INTO sale_items (
            id, sale_id, product_id, unit_id, quantity, unit_price_minor,
            discount_minor, tax_minor, line_total_minor, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          saleId,
          item.productId,
          item.unitId,
          item.quantity,
          item.unitPriceMinor,
          item.discountMinor,
          item.taxMinor,
          lineTotalMinor,
          timestamp,
          timestamp
        );
    }
  }

  private calculateTotals(input: SaleWrite): {
    readonly subtotalMinor: number;
    readonly totalMinor: number;
  } {
    const subtotalMinor = input.items.reduce(
      (total, item) =>
        total + item.quantity * item.unitPriceMinor - item.discountMinor + item.taxMinor,
      0
    );
    return {
      subtotalMinor,
      totalMinor: subtotalMinor - input.discountMinor + input.taxMinor
    };
  }

  private mapSale(row: SaleRow): SaleListItem {
    return {
      id: row.id,
      saleNumber: row.saleNumber,
      returnStatus: row.returnStatus,
      refundedMinor: row.refundedMinor,
      netTotalMinor: row.netTotalMinor,
      customerId: row.customerId,
      customerName: row.customerName,
      saleDate: row.saleDate,
      itemCount: row.itemCount,
      subtotalMinor: row.subtotalMinor,
      discountMinor: row.discountMinor,
      totalMinor: row.totalMinor,
      paidMinor: row.paidMinor,
      changeDueMinor: row.changeDueMinor ?? 0,
      paymentType: row.saleType,
      status: row.status,
      completedAt: row.completedAt,
      cancelledAt: row.cancelledAt,
      updatedAt: row.updatedAt
    };
  }

  private mapSaleDetail(row: SaleRow): Omit<SaleDetail, "items"> {
    const metadata = this.decodeMetadata(row.metadataJson);
    return {
      ...this.mapSale(row),
      taxMinor: row.taxMinor,
      notes: metadata.notes,
      holdReason: metadata.holdReason,
      createdAt: row.createdAt,
      createdByUserId: row.createdByUserId,
      cashierName: row.cashierName ?? "Cashier"
    };
  }

  private getRequiredSale(id: string): CoreResult<SaleDetail> {
    const sale = this.getSale(id);
    if (!sale.ok) return sale;
    return sale.value === undefined
      ? err(repositoryError("REPOSITORY_NOT_FOUND", "Sale was not found"))
      : ok(sale.value);
  }

  private metadataFromInput(input: SaleWrite): SaleMetadata {
    return {
      notes: input.notes ?? null,
      holdReason: input.holdReason ?? null,
      cancellationReason: null
    };
  }

  private encodeMetadata(metadata: SaleMetadata): string {
    return JSON.stringify(metadata);
  }

  private decodeMetadata(value: string | null): SaleMetadata {
    if (value === null || value.trim().length === 0) return defaultMetadata;
    try {
      const parsed = JSON.parse(value) as Partial<SaleMetadata>;
      return {
        notes: typeof parsed.notes === "string" ? parsed.notes : null,
        holdReason: typeof parsed.holdReason === "string" ? parsed.holdReason : null,
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
  ): {
    readonly cashAccountId: string;
    readonly receivableAccountId: string;
    readonly revenueAccountId: string;
  } {
    const timestamp = new Date().toISOString();
    return {
      cashAccountId: this.ensureLedgerAccount(storeId, "1000", "Cash", "asset", userId, timestamp),
      receivableAccountId: this.ensureLedgerAccount(
        storeId,
        "1100",
        "Customer Receivables",
        "asset",
        userId,
        timestamp
      ),
      revenueAccountId: this.ensureLedgerAccount(
        storeId,
        "4000",
        "Sales Revenue",
        "income",
        userId,
        timestamp
      )
    };
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

  private nextSaleNumber(branchId: string): string {
    const row = this.connection.sqlite
      .prepare("SELECT COUNT(*) AS count FROM sales WHERE branch_id = ?")
      .get(branchId) as CountRow;
    return `SL-${String(row.count + 1).padStart(6, "0")}`;
  }

  private nextSaleReturnNumber(branchId: string): string {
    const row = this.connection.sqlite
      .prepare("SELECT COUNT(*) AS count FROM sales_returns WHERE branch_id = ?")
      .get(branchId) as CountRow;
    return `SR-${String(row.count + 1).padStart(6, "0")}`;
  }

  private money(sql: string, ...params: readonly string[]): number {
    return (
      (this.connection.sqlite.prepare(sql).get(...params) as MoneyRow | undefined)?.amount ?? 0
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
        ) VALUES (?, ?, ?, ?, ?, ?, 'sale', ?, ?, ?, ?)`
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
