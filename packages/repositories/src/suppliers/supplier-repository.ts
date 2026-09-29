import { randomUUID } from "node:crypto";
import { suppliers } from "@orix/database";
import type { CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";
import { repositoryError } from "../shared/repository-error.js";

export type SupplierStatusFilter = "active" | "archived" | "all";
export type SupplierSortBy =
  "name" | "phone" | "city" | "balance" | "lastPurchase" | "status" | "createdAt";

export type SupplierMetadata = {
  readonly city: string | null;
  readonly ntn: string | null;
  readonly strn: string | null;
  readonly tags: readonly string[];
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate: string | null;
  readonly notes: string | null;
};

export type SupplierListQuery = {
  readonly storeId: string;
  readonly search?: string;
  readonly status?: SupplierStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: SupplierSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type SupplierListItem = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly ntn: string | null;
  readonly strn: string | null;
  readonly tags: readonly string[];
  readonly creditTerms: string | null;
  readonly outstandingBalanceMinor: number;
  readonly lastPurchaseAt: string | null;
  readonly status: "active" | "archived";
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
};

export type SupplierDetail = SupplierListItem & {
  readonly notes: string | null;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
};

export type SupplierPage = {
  readonly items: readonly SupplierListItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type SupplierWrite = {
  readonly id?: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly name: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly ntn?: string | null;
  readonly strn?: string | null;
  readonly tags: readonly string[];
  readonly creditTerms?: string | null;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate?: string | null;
  readonly notes?: string | null;
  readonly expectedUpdatedAt?: string | null;
};

export type SupplierStatementQuery = {
  readonly storeId: string;
  readonly supplierId: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly transactionType?: "all" | "opening-balance" | "payment" | "purchase";
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
};

export type SupplierStatementLine = {
  readonly id: string;
  readonly date: string;
  readonly reference: string;
  readonly transactionType: string;
  readonly description: string;
  readonly debitMinor: number;
  readonly creditMinor: number;
  readonly runningBalanceMinor: number;
  readonly userName: string;
};

export type SupplierStatement = {
  readonly supplier: SupplierDetail;
  readonly openingBalanceMinor: number;
  readonly closingBalanceMinor: number;
  readonly generatedAt: string;
  readonly preparedBy: string;
  readonly items: readonly SupplierStatementLine[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type SupplierPaymentWrite = {
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly supplierId: string;
  readonly amountMinor: number;
  readonly paymentMethod: "cash" | "bank" | "jazzcash" | "easypaisa" | "card";
  readonly paidAt: string;
  readonly referenceNumber?: string | null;
  readonly receiptNumber?: string | null;
  readonly notes?: string | null;
};

export type SupplierPayment = {
  readonly id: string;
  readonly supplierId: string;
  readonly paymentNumber: string;
  readonly amountMinor: number;
  readonly paidAt: string;
  readonly method: string;
  readonly notes: string | null;
};

export type SupplierActivity = {
  readonly id: string;
  readonly action: string;
  readonly occurredAt: string;
  readonly userName: string;
  readonly details: string | null;
};

export type SupplierSummary = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly city: string | null;
  readonly balanceMinor: number;
};

type SupplierRow = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly status: string;
  readonly paymentTerms: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly archivedAt: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
  readonly outstandingBalanceMinor: number | null;
  readonly lastPurchaseAt: string | null;
};

type StatementRow = {
  readonly id: string;
  readonly date: string;
  readonly reference: string | null;
  readonly transactionType: string;
  readonly description: string | null;
  readonly debitMinor: number;
  readonly creditMinor: number;
  readonly userName: string | null;
};

type CountRow = { readonly count: number };
type IdRow = { readonly id: string };

const defaultMetadata: SupplierMetadata = {
  city: null,
  ntn: null,
  strn: null,
  tags: [],
  openingBalanceMinor: 0,
  openingBalanceDate: null,
  notes: null
};

export class SupplierRepository extends BaseRepository<typeof suppliers> {
  private readonly connection: RepositoryConnection;

  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: suppliers,
      tableName: "suppliers",
      searchableColumns: [suppliers.name, suppliers.phone, suppliers.email],
      dateColumn: suppliers.createdAt,
      sortableColumns: {
        name: suppliers.name,
        createdAt: suppliers.createdAt,
        status: suppliers.status
      }
    });
    this.connection = connection;
  }

  public listSuppliers(query: SupplierListQuery): CoreResult<SupplierPage> {
    try {
      const page = Math.max(1, query.page);
      const pageSize = Math.max(1, query.pageSize);
      const where = this.supplierWhere(query);
      const totalItems = (
        this.connection.sqlite
          .prepare(`SELECT COUNT(*) AS count FROM (${this.supplierBaseSql()} ${where.sql})`)
          .get(...where.params) as CountRow
      ).count;
      const rows = this.connection.sqlite
        .prepare(
          `${this.supplierBaseSql()} ${where.sql} ${this.supplierOrder(query)} LIMIT ? OFFSET ?`
        )
        .all(...where.params, pageSize, (page - 1) * pageSize) as SupplierRow[];
      return ok({
        items: rows.map((row) => this.mapSupplier(row)),
        totalItems,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to list suppliers", cause));
    }
  }

  public getSupplier(id: string): CoreResult<SupplierDetail | undefined> {
    try {
      const row = this.connection.sqlite
        .prepare(`${this.supplierBaseSql()} WHERE s.id = ? LIMIT 1`)
        .get(id) as SupplierRow | undefined;
      return ok(row === undefined ? undefined : this.mapSupplierDetail(row));
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load supplier", cause));
    }
  }

  public phoneExists(storeId: string, phone: string, exceptId?: string): CoreResult<boolean> {
    try {
      const row = this.connection.sqlite
        .prepare(
          `SELECT id FROM suppliers
            WHERE store_id = ? AND phone = ? AND (? IS NULL OR id <> ?) AND archived_at IS NULL
            LIMIT 1`
        )
        .get(storeId, phone, exceptId ?? null, exceptId ?? null);
      return ok(row !== undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to validate phone", cause));
    }
  }

  public createSupplier(input: SupplierWrite): CoreResult<SupplierDetail> {
    try {
      const id = input.id ?? randomUUID();
      const timestamp = new Date().toISOString();
      this.connection.sqlite
        .prepare(
          `INSERT INTO suppliers (
            id, store_id, name, phone, email, address, status, payment_terms, notes,
            created_at, updated_at, created_by_user_id, updated_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.storeId,
          input.name,
          input.phone ?? null,
          input.email ?? null,
          input.address ?? null,
          input.creditTerms ?? null,
          this.encodeMetadata(input),
          timestamp,
          timestamp,
          input.userId,
          input.userId
        );
      if (input.openingBalanceMinor !== 0) {
        this.createOpeningBalanceLedger(id, input, timestamp);
      }
      this.writeAudit(input, "SupplierCreated", id, { name: input.name });
      return this.getRequiredSupplier(id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create supplier", cause));
    }
  }

  public updateSupplier(
    input: SupplierWrite & { readonly id: string }
  ): CoreResult<SupplierDetail> {
    try {
      const existing = this.getSupplier(input.id);
      if (!existing.ok) return existing;
      if (existing.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Supplier was not found"));
      }
      if (
        input.expectedUpdatedAt !== undefined &&
        existing.value.updatedAt !== input.expectedUpdatedAt
      ) {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Supplier was changed by another action")
        );
      }
      const timestamp = new Date().toISOString();
      this.connection.sqlite
        .prepare(
          `UPDATE suppliers
              SET name = ?, phone = ?, email = ?, address = ?, payment_terms = ?,
                  notes = ?, updated_at = ?, updated_by_user_id = ?
            WHERE id = ? AND store_id = ?`
        )
        .run(
          input.name,
          input.phone ?? null,
          input.email ?? null,
          input.address ?? null,
          input.creditTerms ?? null,
          this.encodeMetadata(input),
          timestamp,
          input.userId,
          input.id,
          input.storeId
        );
      this.writeAudit(input, "SupplierUpdated", input.id, { name: input.name });
      return this.getRequiredSupplier(input.id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update supplier", cause));
    }
  }

  public archiveSupplier(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): CoreResult<void> {
    return this.updateArchiveState(input, true);
  }

  public restoreSupplier(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): CoreResult<void> {
    return this.updateArchiveState(input, false);
  }

  public statement(
    query: SupplierStatementQuery,
    preparedBy: string
  ): CoreResult<SupplierStatement> {
    try {
      const supplier = this.getSupplier(query.supplierId);
      if (!supplier.ok) return supplier;
      if (supplier.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Supplier was not found"));
      }
      const page = Math.max(1, query.page);
      const pageSize = Math.max(1, query.pageSize);
      const where = this.statementWhere(query);
      const allRows = this.connection.sqlite
        .prepare(`${this.statementBaseSql()} ${where.sql} ORDER BY lt.posted_at ASC, le.id ASC`)
        .all(...where.params) as StatementRow[];
      let running = 0;
      const allLines = allRows.map((row) => {
        running += row.creditMinor - row.debitMinor;
        return this.mapStatementLine(row, running);
      });
      const offset = (page - 1) * pageSize;
      return ok({
        supplier: supplier.value,
        openingBalanceMinor: supplier.value.openingBalanceMinor,
        closingBalanceMinor: running,
        generatedAt: new Date().toISOString(),
        preparedBy,
        items: allLines.slice(offset, offset + pageSize),
        totalItems: allLines.length,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(allLines.length / pageSize))
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load statement", cause));
    }
  }

  public recordPayment(input: SupplierPaymentWrite): CoreResult<SupplierPayment> {
    try {
      const timestamp = new Date().toISOString();
      const paymentId = randomUUID();
      const receiptNumber = input.receiptNumber?.trim();
      const paymentNumber =
        receiptNumber !== undefined && receiptNumber.length > 0
          ? receiptNumber
          : this.nextPaymentNumber(input.branchId);
      const cashAccountId = this.ensureCashAccount(input);
      const paymentMethodId = this.ensurePaymentMethod(input);
      const accounts = this.ensureLedgerAccounts(input.storeId, input.userId);
      const isCash = input.paymentMethod === "cash";
      const settlementAccountId = isCash
        ? accounts.cashAccountId
        : this.ensureLedgerAccount(
            input.storeId,
            `SETTLEMENT-${input.paymentMethod.toUpperCase()}`,
            this.paymentMethodName(input.paymentMethod),
            "asset",
            input.userId,
            timestamp
          );
      this.connection.sqlite
        .prepare(
          `INSERT INTO supplier_payments (
            id, store_id, branch_id, business_day_id, supplier_id, cash_account_id,
            payment_method_id, payment_number, amount_minor, status, paid_at, notes,
            created_at, created_by_user_id, posted_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'recorded', ?, ?, ?, ?, ?)`
        )
        .run(
          paymentId,
          input.storeId,
          input.branchId,
          input.businessDayId,
          input.supplierId,
          cashAccountId,
          paymentMethodId,
          paymentNumber,
          input.amountMinor,
          input.paidAt,
          this.paymentNotes(input),
          timestamp,
          input.userId,
          input.userId
        );
      const transactionId = randomUUID();
      this.connection.sqlite
        .prepare(
          `INSERT INTO ledger_transactions (
            id, store_id, branch_id, business_day_id, source_type, source_id,
            transaction_type, status, posted_at, posted_by_user_id, memo, created_at
          ) VALUES (?, ?, ?, ?, 'supplier_payment', ?, 'payment', 'posted', ?, ?, ?, ?)`
        )
        .run(
          transactionId,
          input.storeId,
          input.branchId,
          input.businessDayId,
          paymentId,
          input.paidAt,
          input.userId,
          input.notes ?? "Supplier payment",
          timestamp
        );
      this.insertLedgerEntry(
        transactionId,
        accounts.payableAccountId,
        "payable",
        "supplier",
        input.supplierId,
        input.amountMinor,
        0,
        "Supplier payment"
      );
      this.insertLedgerEntry(
        transactionId,
        settlementAccountId,
        isCash ? "cash" : "noncash",
        null,
        null,
        0,
        input.amountMinor,
        isCash ? "Cash paid" : "Noncash payment sent"
      );
      this.writeAudit(input, "SupplierPaymentRecorded", input.supplierId, {
        paymentId,
        amountMinor: input.amountMinor
      });
      return ok({
        id: paymentId,
        supplierId: input.supplierId,
        paymentNumber,
        amountMinor: input.amountMinor,
        paidAt: input.paidAt,
        method: input.paymentMethod,
        notes: input.notes ?? null
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to record payment", cause));
    }
  }

  public activity(supplierId: string): CoreResult<readonly SupplierActivity[]> {
    try {
      const rows = this.connection.sqlite
        .prepare(
          `SELECT a.id, a.action, a.occurred_at AS occurredAt,
                  COALESCE(u.display_name, 'System') AS userName,
                  a.metadata_json AS details
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.actor_user_id
            WHERE a.target_type = 'supplier' AND a.target_id = ?
            ORDER BY a.occurred_at DESC
            LIMIT 40`
        )
        .all(supplierId) as SupplierActivity[];
      return ok(rows);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load activity", cause));
    }
  }

  public topSuppliers(storeId: string, limit: number): CoreResult<readonly SupplierSummary[]> {
    try {
      const rows = this.connection.sqlite
        .prepare(
          `SELECT s.id, s.name, s.phone, s.notes,
                  COALESCE(SUM(p.total_minor), 0) AS balance
             FROM suppliers s
             LEFT JOIN purchases p ON p.supplier_id = s.id AND p.status = 'received'
            WHERE s.store_id = ? AND s.archived_at IS NULL
            GROUP BY s.id
            HAVING balance > 0
            ORDER BY balance DESC
            LIMIT ?`
        )
        .all(storeId, limit) as (SupplierRow & { readonly balance: number })[];
      return ok(rows.map((row) => this.mapSummary(row, row.balance)));
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load suppliers", cause));
    }
  }

  private supplierBaseSql(): string {
    return `
      SELECT s.id, s.name, s.phone, s.email, s.address, s.status,
             s.payment_terms AS paymentTerms, s.notes, s.created_at AS createdAt,
             s.updated_at AS updatedAt, s.archived_at AS archivedAt,
             s.created_by_user_id AS createdByUserId, s.updated_by_user_id AS updatedByUserId,
             COALESCE(balance.amount, 0) AS outstandingBalanceMinor,
             last_purchase.lastPurchaseAt AS lastPurchaseAt
        FROM suppliers s
        LEFT JOIN (
          SELECT account_ref_id, SUM(credit_minor - debit_minor) AS amount
            FROM ledger_entries
           WHERE account_ref_type = 'supplier'
           GROUP BY account_ref_id
        ) balance ON balance.account_ref_id = s.id
        LEFT JOIN (
          SELECT supplier_id, MAX(received_at) AS lastPurchaseAt
            FROM purchases
           WHERE status = 'received'
           GROUP BY supplier_id
        ) last_purchase ON last_purchase.supplier_id = s.id`;
  }

  private supplierWhere(query: SupplierListQuery): {
    readonly sql: string;
    readonly params: readonly unknown[];
  } {
    const clauses = ["s.store_id = ?"];
    const params: unknown[] = [query.storeId];
    if ((query.status ?? "active") === "active")
      clauses.push("s.archived_at IS NULL AND s.status = 'active'");
    if (query.status === "archived") clauses.push("s.archived_at IS NOT NULL");
    const search = query.search?.trim().toLowerCase();
    if (search !== undefined && search.length > 0) {
      clauses.push(
        "(lower(s.name) LIKE ? OR lower(COALESCE(s.phone, '')) LIKE ? OR lower(COALESCE(s.email, '')) LIKE ? OR lower(COALESCE(s.notes, '')) LIKE ? OR lower(s.id) LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private supplierOrder(query: SupplierListQuery): string {
    const direction = query.sortDirection === "desc" ? "DESC" : "ASC";
    const column: Record<SupplierSortBy, string> = {
      name: "s.name",
      phone: "s.phone",
      city: "s.notes",
      balance: "outstandingBalanceMinor",
      lastPurchase: "lastPurchaseAt",
      status: "s.status",
      createdAt: "s.created_at"
    };
    return `ORDER BY ${column[query.sortBy]} ${direction}, s.name ASC`;
  }

  private statementBaseSql(): string {
    return `
      SELECT le.id, lt.posted_at AS date,
             CASE
               WHEN lt.source_type = 'supplier_payment' THEN sp.payment_number
               WHEN lt.source_type = 'purchase' THEN p.purchase_number
               ELSE lt.source_type || ':' || lt.source_id
             END AS reference,
             lt.transaction_type AS transactionType,
             COALESCE(le.memo, lt.memo) AS description,
             le.debit_minor AS debitMinor,
             le.credit_minor AS creditMinor,
             COALESCE(u.display_name, 'System') AS userName
        FROM ledger_entries le
        JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
        LEFT JOIN supplier_payments sp ON sp.id = lt.source_id AND lt.source_type = 'supplier_payment'
        LEFT JOIN purchases p ON p.id = lt.source_id AND lt.source_type = 'purchase'
        LEFT JOIN users u ON u.id = lt.posted_by_user_id`;
  }

  private statementWhere(query: SupplierStatementQuery): {
    readonly sql: string;
    readonly params: readonly unknown[];
  } {
    const clauses = ["le.account_ref_type = 'supplier'", "le.account_ref_id = ?"];
    const params: unknown[] = [query.supplierId];
    if (query.dateFrom !== undefined && query.dateFrom.length > 0) {
      clauses.push("lt.posted_at >= ?");
      params.push(query.dateFrom);
    }
    if (query.dateTo !== undefined && query.dateTo.length > 0) {
      clauses.push("lt.posted_at <= ?");
      params.push(query.dateTo);
    }
    if (query.transactionType !== undefined && query.transactionType !== "all") {
      clauses.push("lt.transaction_type = ?");
      params.push(query.transactionType);
    }
    const search = query.search?.trim().toLowerCase();
    if (search !== undefined && search.length > 0) {
      clauses.push(
        "(lower(COALESCE(le.memo, lt.memo, '')) LIKE ? OR lower(COALESCE(sp.payment_number, p.purchase_number, '')) LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`);
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private mapSupplier(row: SupplierRow): SupplierListItem {
    const metadata = this.decodeMetadata(row.notes);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      city: metadata.city,
      ntn: metadata.ntn,
      strn: metadata.strn,
      tags: metadata.tags,
      creditTerms: row.paymentTerms,
      outstandingBalanceMinor: row.outstandingBalanceMinor ?? 0,
      lastPurchaseAt: row.lastPurchaseAt,
      status: row.archivedAt === null ? "active" : "archived",
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapSupplierDetail(row: SupplierRow): SupplierDetail {
    const metadata = this.decodeMetadata(row.notes);
    return {
      ...this.mapSupplier(row),
      notes: metadata.notes,
      openingBalanceMinor: metadata.openingBalanceMinor,
      openingBalanceDate: metadata.openingBalanceDate,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId
    };
  }

  private mapStatementLine(row: StatementRow, runningBalanceMinor: number): SupplierStatementLine {
    return {
      id: row.id,
      date: row.date,
      reference: row.reference ?? "-",
      transactionType: row.transactionType,
      description: row.description ?? row.transactionType,
      debitMinor: row.debitMinor,
      creditMinor: row.creditMinor,
      runningBalanceMinor,
      userName: row.userName ?? "System"
    };
  }

  private mapSummary(row: SupplierRow, balanceMinor: number): SupplierSummary {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      city: this.decodeMetadata(row.notes).city,
      balanceMinor
    };
  }

  private getRequiredSupplier(id: string): CoreResult<SupplierDetail> {
    const supplier = this.getSupplier(id);
    if (!supplier.ok) return supplier;
    return supplier.value === undefined
      ? err(repositoryError("REPOSITORY_NOT_FOUND", "Supplier was not found"))
      : ok(supplier.value);
  }

  private updateArchiveState(
    input: {
      readonly id: string;
      readonly storeId: string;
      readonly branchId: string;
      readonly businessDayId: string;
      readonly userId: string;
    },
    archived: boolean
  ): CoreResult<void> {
    try {
      const timestamp = new Date().toISOString();
      this.connection.sqlite
        .prepare(
          "UPDATE suppliers SET archived_at = ?, updated_at = ?, updated_by_user_id = ? WHERE id = ? AND store_id = ?"
        )
        .run(archived ? timestamp : null, timestamp, input.userId, input.id, input.storeId);
      this.writeAudit(input, archived ? "SupplierArchived" : "SupplierRestored", input.id, {});
      return ok(undefined);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update supplier archive state", cause)
      );
    }
  }

  private encodeMetadata(input: SupplierWrite): string {
    const city = input.city?.trim();
    const ntn = input.ntn?.trim();
    const strn = input.strn?.trim();
    const notes = input.notes?.trim();
    return JSON.stringify({
      city: city !== undefined && city.length > 0 ? city : null,
      ntn: ntn !== undefined && ntn.length > 0 ? ntn : null,
      strn: strn !== undefined && strn.length > 0 ? strn : null,
      tags: input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
      openingBalanceMinor: input.openingBalanceMinor,
      openingBalanceDate: input.openingBalanceDate ?? null,
      notes: notes !== undefined && notes.length > 0 ? notes : null
    } satisfies SupplierMetadata);
  }

  private decodeMetadata(notes: string | null): SupplierMetadata {
    if (notes === null || notes.trim().length === 0) return defaultMetadata;
    try {
      const value: unknown = JSON.parse(notes);
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return { ...defaultMetadata, notes };
      }
      const parsed = value as Partial<SupplierMetadata>;
      return {
        city: typeof parsed.city === "string" ? parsed.city : null,
        ntn: typeof parsed.ntn === "string" ? parsed.ntn : null,
        strn: typeof parsed.strn === "string" ? parsed.strn : null,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        openingBalanceMinor:
          typeof parsed.openingBalanceMinor === "number" ? parsed.openingBalanceMinor : 0,
        openingBalanceDate:
          typeof parsed.openingBalanceDate === "string" ? parsed.openingBalanceDate : null,
        notes: typeof parsed.notes === "string" ? parsed.notes : null
      };
    } catch {
      return { ...defaultMetadata, notes };
    }
  }

  private createOpeningBalanceLedger(
    supplierId: string,
    input: SupplierWrite,
    timestamp: string
  ): void {
    const accounts = this.ensureLedgerAccounts(input.storeId, input.userId);
    const transactionId = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_transactions (
          id, store_id, branch_id, business_day_id, source_type, source_id,
          transaction_type, status, posted_at, posted_by_user_id, memo, created_at
        ) VALUES (?, ?, ?, ?, 'supplier', ?, 'opening-balance', 'posted', ?, ?, 'Opening supplier balance', ?)`
      )
      .run(
        transactionId,
        input.storeId,
        input.branchId,
        input.businessDayId,
        supplierId,
        input.openingBalanceDate ?? timestamp,
        input.userId,
        timestamp
      );
    this.insertLedgerEntry(
      transactionId,
      accounts.payableAccountId,
      "payable",
      "supplier",
      supplierId,
      Math.max(0, -input.openingBalanceMinor),
      Math.max(0, input.openingBalanceMinor),
      "Opening balance"
    );
  }

  private ensureLedgerAccounts(
    storeId: string,
    userId: string
  ): { readonly cashAccountId: string; readonly payableAccountId: string } {
    const timestamp = new Date().toISOString();
    const cashAccountId = this.ensureLedgerAccount(
      storeId,
      "1000",
      "Cash",
      "asset",
      userId,
      timestamp
    );
    const payableAccountId = this.ensureLedgerAccount(
      storeId,
      "2000",
      "Supplier Payables",
      "liability",
      userId,
      timestamp
    );
    return { cashAccountId, payableAccountId };
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

  private ensureCashAccount(input: SupplierPaymentWrite): string {
    const name =
      input.paymentMethod === "cash"
        ? "Main Cash Drawer"
        : this.paymentMethodName(input.paymentMethod);
    const existing = this.connection.sqlite
      .prepare("SELECT id FROM cash_accounts WHERE branch_id = ? AND name = ? LIMIT 1")
      .get(input.branchId, name) as IdRow | undefined;
    if (existing !== undefined) return existing.id;
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    this.connection.sqlite
      .prepare(
        `INSERT INTO cash_accounts (id, store_id, branch_id, name, account_type, status, currency_code, opened_at, created_at, updated_at, created_by_user_id, updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, 'active', 'PKR', ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.storeId,
        input.branchId,
        name,
        input.paymentMethod === "cash" ? "cash_drawer" : "bank",
        timestamp,
        timestamp,
        timestamp,
        input.userId,
        input.userId
      );
    return id;
  }

  private ensurePaymentMethod(input: SupplierPaymentWrite): string {
    const code = input.paymentMethod.toUpperCase();
    const existing = this.connection.sqlite
      .prepare("SELECT id FROM payment_methods WHERE store_id = ? AND code = ? LIMIT 1")
      .get(input.storeId, code) as IdRow | undefined;
    if (existing !== undefined) return existing.id;
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    this.connection.sqlite
      .prepare(
        `INSERT INTO payment_methods (id, store_id, code, name, method_type, status, is_system_method, created_at, updated_at, created_by_user_id, updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.storeId,
        code,
        this.paymentMethodName(input.paymentMethod),
        input.paymentMethod,
        timestamp,
        timestamp,
        input.userId,
        input.userId
      );
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

  private nextPaymentNumber(branchId: string): string {
    const row = this.connection.sqlite
      .prepare("SELECT COUNT(*) AS count FROM supplier_payments WHERE branch_id = ?")
      .get(branchId) as CountRow;
    return `SP-${String(row.count + 1).padStart(6, "0")}`;
  }

  private paymentMethodName(method: SupplierPaymentWrite["paymentMethod"]): string {
    const names: Record<SupplierPaymentWrite["paymentMethod"], string> = {
      cash: "Cash",
      bank: "Bank",
      jazzcash: "JazzCash",
      easypaisa: "EasyPaisa",
      card: "Card"
    };
    return names[method];
  }

  private paymentNotes(input: SupplierPaymentWrite): string | null {
    return JSON.stringify({
      referenceNumber: input.referenceNumber ?? null,
      notes: input.notes ?? null
    });
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
        ) VALUES (?, ?, ?, ?, ?, ?, 'supplier', ?, ?, ?, ?)`
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
