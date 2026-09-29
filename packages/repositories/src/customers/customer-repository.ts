import { randomUUID } from "node:crypto";
import { customers } from "@orix/database";
import type { CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import { BaseRepository } from "../shared/base-repository.js";
import type { RepositoryConnection } from "../shared/repository-factory.js";
import { repositoryError } from "../shared/repository-error.js";

export type CustomerType = "walk-in" | "regular" | "wholesale" | "vip";
export type CustomerStatusFilter = "active" | "archived" | "all";
export type CustomerSortBy =
  "name" | "phone" | "city" | "balance" | "creditLimit" | "lastPurchase" | "status" | "createdAt";

export type CustomerProfileMetadata = {
  readonly city: string | null;
  readonly cnic: string | null;
  readonly tags: readonly string[];
  readonly customerType: CustomerType;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate: string | null;
  readonly notes: string | null;
};

export type CustomerListQuery = {
  readonly storeId: string;
  readonly search?: string;
  readonly status?: CustomerStatusFilter;
  readonly customerType?: CustomerType | "all";
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: CustomerSortBy;
  readonly sortDirection: "asc" | "desc";
};

export type CustomerListItem = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly cnic: string | null;
  readonly tags: readonly string[];
  readonly customerType: CustomerType;
  readonly outstandingBalanceMinor: number;
  readonly creditLimitMinor: number;
  readonly lastPurchaseAt: string | null;
  readonly status: "active" | "archived";
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
};

export type CustomerDetail = CustomerListItem & {
  readonly notes: string | null;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate: string | null;
  readonly createdByUserId: string | null;
  readonly updatedByUserId: string | null;
};

export type CustomerPage = {
  readonly items: readonly CustomerListItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type CustomerWrite = {
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
  readonly cnic?: string | null;
  readonly tags: readonly string[];
  readonly customerType: CustomerType;
  readonly creditLimitMinor: number;
  readonly openingBalanceMinor: number;
  readonly openingBalanceDate?: string | null;
  readonly notes?: string | null;
  readonly expectedUpdatedAt?: string | null;
};

export type CustomerStatementQuery = {
  readonly storeId: string;
  readonly customerId: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly transactionType?: "all" | "opening-balance" | "payment" | "sale";
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
};

export type CustomerStatementLine = {
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

export type CustomerStatement = {
  readonly customer: CustomerDetail;
  readonly openingBalanceMinor: number;
  readonly closingBalanceMinor: number;
  readonly generatedAt: string;
  readonly preparedBy: string;
  readonly items: readonly CustomerStatementLine[];
  readonly totalItems: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
};

export type CustomerPaymentWrite = {
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
  readonly customerId: string;
  readonly amountMinor: number;
  readonly paymentMethod: "cash" | "bank" | "jazzcash" | "easypaisa" | "card";
  readonly paidAt: string;
  readonly referenceNumber?: string | null;
  readonly receiptNumber?: string | null;
  readonly notes?: string | null;
};

export type CustomerPayment = {
  readonly id: string;
  readonly customerId: string;
  readonly paymentNumber: string;
  readonly amountMinor: number;
  readonly paidAt: string;
  readonly method: string;
  readonly notes: string | null;
};

export type CustomerActivity = {
  readonly id: string;
  readonly action: string;
  readonly occurredAt: string;
  readonly userName: string;
  readonly details: string | null;
};

export type CustomerSummary = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly city: string | null;
  readonly balanceMinor: number;
};

type CustomerRow = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly status: string;
  readonly creditLimitMinor: number;
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

type CountRow = {
  readonly count: number;
};

type IdRow = {
  readonly id: string;
};

const defaultMetadata: CustomerProfileMetadata = {
  city: null,
  cnic: null,
  tags: [],
  customerType: "regular",
  openingBalanceMinor: 0,
  openingBalanceDate: null,
  notes: null
};

export class CustomerRepository extends BaseRepository<typeof customers> {
  private readonly connection: RepositoryConnection;

  public constructor(connection: RepositoryConnection) {
    super({
      db: connection.drizzle,
      table: customers,
      tableName: "customers",
      searchableColumns: [customers.name, customers.phone, customers.email],
      dateColumn: customers.createdAt,
      sortableColumns: {
        name: customers.name,
        createdAt: customers.createdAt,
        status: customers.status
      }
    });
    this.connection = connection;
  }

  public listCustomers(query: CustomerListQuery): CoreResult<CustomerPage> {
    try {
      const page = Math.max(1, query.page);
      const pageSize = Math.max(1, query.pageSize);
      const where = this.customerWhere(query);
      const totalItems = (
        this.connection.sqlite
          .prepare(`SELECT COUNT(*) AS count FROM (${this.customerBaseSql()} ${where.sql})`)
          .get(...where.params) as CountRow
      ).count;
      const rows = this.connection.sqlite
        .prepare(
          `${this.customerBaseSql()} ${where.sql} ${this.customerOrder(query)} LIMIT ? OFFSET ?`
        )
        .all(...where.params, pageSize, (page - 1) * pageSize) as CustomerRow[];
      return ok({
        items: rows.map((row) => this.mapCustomer(row)),
        totalItems,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
      });
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to list customers", cause));
    }
  }

  public getCustomer(id: string): CoreResult<CustomerDetail | undefined> {
    try {
      const row = this.connection.sqlite
        .prepare(`${this.customerBaseSql()} WHERE c.id = ? LIMIT 1`)
        .get(id) as CustomerRow | undefined;
      return ok(row === undefined ? undefined : this.mapCustomerDetail(row));
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load customer", cause));
    }
  }

  public phoneExists(storeId: string, phone: string, exceptId?: string): CoreResult<boolean> {
    try {
      const row = this.connection.sqlite
        .prepare(
          `SELECT id FROM customers
            WHERE store_id = ? AND phone = ? AND (? IS NULL OR id <> ?) AND archived_at IS NULL
            LIMIT 1`
        )
        .get(storeId, phone, exceptId ?? null, exceptId ?? null);
      return ok(row !== undefined);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to validate phone", cause));
    }
  }

  public createCustomer(input: CustomerWrite): CoreResult<CustomerDetail> {
    try {
      const id = input.id ?? randomUUID();
      const timestamp = new Date().toISOString();
      this.connection.sqlite
        .prepare(
          `INSERT INTO customers (
            id, store_id, name, phone, email, address, status, credit_allowed, credit_limit_minor,
            notes, created_at, updated_at, created_by_user_id, updated_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.storeId,
          input.name,
          input.phone ?? null,
          input.email ?? null,
          input.address ?? null,
          input.creditLimitMinor > 0 ? 1 : 0,
          input.creditLimitMinor,
          this.encodeMetadata(input),
          timestamp,
          timestamp,
          input.userId,
          input.userId
        );
      if (input.openingBalanceMinor !== 0) {
        this.createOpeningBalanceLedger(id, input, timestamp);
      }
      this.writeAudit(input, "CustomerCreated", id, { name: input.name });
      return this.getRequiredCustomer(id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to create customer", cause));
    }
  }

  public updateCustomer(
    input: CustomerWrite & { readonly id: string }
  ): CoreResult<CustomerDetail> {
    try {
      const existing = this.getCustomer(input.id);
      if (!existing.ok) return existing;
      if (existing.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Customer was not found"));
      }
      if (
        input.expectedUpdatedAt !== undefined &&
        existing.value.updatedAt !== input.expectedUpdatedAt
      ) {
        return err(
          repositoryError("REPOSITORY_CONFLICT", "Customer was changed by another action")
        );
      }
      const timestamp = new Date().toISOString();
      this.connection.sqlite
        .prepare(
          `UPDATE customers
              SET name = ?, phone = ?, email = ?, address = ?, credit_allowed = ?,
                  credit_limit_minor = ?, notes = ?, updated_at = ?, updated_by_user_id = ?
            WHERE id = ? AND store_id = ?`
        )
        .run(
          input.name,
          input.phone ?? null,
          input.email ?? null,
          input.address ?? null,
          input.creditLimitMinor > 0 ? 1 : 0,
          input.creditLimitMinor,
          this.encodeMetadata(input),
          timestamp,
          input.userId,
          input.id,
          input.storeId
        );
      this.writeAudit(input, "CustomerUpdated", input.id, { name: input.name });
      return this.getRequiredCustomer(input.id);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update customer", cause));
    }
  }

  public archiveCustomer(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): CoreResult<void> {
    return this.updateArchiveState(input, true);
  }

  public restoreCustomer(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): CoreResult<void> {
    return this.updateArchiveState(input, false);
  }

  public statement(
    query: CustomerStatementQuery,
    preparedBy: string
  ): CoreResult<CustomerStatement> {
    try {
      const customer = this.getCustomer(query.customerId);
      if (!customer.ok) return customer;
      if (customer.value === undefined) {
        return err(repositoryError("REPOSITORY_NOT_FOUND", "Customer was not found"));
      }
      const page = Math.max(1, query.page);
      const pageSize = Math.max(1, query.pageSize);
      const where = this.statementWhere(query);
      const allRows = this.connection.sqlite
        .prepare(`${this.statementBaseSql()} ${where.sql} ORDER BY lt.posted_at ASC, le.id ASC`)
        .all(...where.params) as StatementRow[];
      let running = 0;
      const allLines = allRows.map((row) => {
        running += row.debitMinor - row.creditMinor;
        return this.mapStatementLine(row, running);
      });
      const offset = (page - 1) * pageSize;
      return ok({
        customer: customer.value,
        openingBalanceMinor: customer.value.openingBalanceMinor,
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

  public recordPayment(input: CustomerPaymentWrite): CoreResult<CustomerPayment> {
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
          `INSERT INTO customer_payments (
            id, store_id, branch_id, business_day_id, customer_id, cash_account_id,
            payment_method_id, payment_number, amount_minor, status, paid_at, notes,
            created_at, created_by_user_id, posted_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'recorded', ?, ?, ?, ?, ?)`
        )
        .run(
          paymentId,
          input.storeId,
          input.branchId,
          input.businessDayId,
          input.customerId,
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
          ) VALUES (?, ?, ?, ?, 'customer_payment', ?, 'payment', 'posted', ?, ?, ?, ?)`
        )
        .run(
          transactionId,
          input.storeId,
          input.branchId,
          input.businessDayId,
          paymentId,
          input.paidAt,
          input.userId,
          input.notes ?? "Customer payment",
          timestamp
        );
      this.insertLedgerEntry(
        transactionId,
        settlementAccountId,
        isCash ? "cash" : "noncash",
        null,
        null,
        input.amountMinor,
        0,
        isCash ? "Cash received" : "Noncash payment received"
      );
      this.insertLedgerEntry(
        transactionId,
        accounts.receivableAccountId,
        "receivable",
        "customer",
        input.customerId,
        0,
        input.amountMinor,
        "Customer payment"
      );
      this.writeAudit(input, "CustomerPaymentRecorded", input.customerId, {
        paymentId,
        amountMinor: input.amountMinor
      });
      return ok({
        id: paymentId,
        customerId: input.customerId,
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

  public activity(customerId: string): CoreResult<readonly CustomerActivity[]> {
    try {
      const rows = this.connection.sqlite
        .prepare(
          `SELECT a.id, a.action, a.occurred_at AS occurredAt,
                  COALESCE(u.display_name, 'System') AS userName,
                  a.metadata_json AS details
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.actor_user_id
            WHERE a.target_type = 'customer' AND a.target_id = ?
            ORDER BY a.occurred_at DESC
            LIMIT 40`
        )
        .all(customerId) as {
        readonly id: string;
        readonly action: string;
        readonly occurredAt: string;
        readonly userName: string;
        readonly details: string | null;
      }[];
      return ok(rows);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load activity", cause));
    }
  }

  public topDebtors(storeId: string, limit: number): CoreResult<readonly CustomerSummary[]> {
    try {
      const rows = this.connection.sqlite
        .prepare(
          `SELECT c.id, c.name, c.phone, c.notes,
                  COALESCE(SUM(le.debit_minor - le.credit_minor), 0) AS balance
             FROM customers c
             LEFT JOIN ledger_entries le ON le.account_ref_type = 'customer' AND le.account_ref_id = c.id
            WHERE c.store_id = ? AND c.archived_at IS NULL
            GROUP BY c.id
            HAVING balance > 0
            ORDER BY balance DESC
            LIMIT ?`
        )
        .all(storeId, limit) as (CustomerRow & { readonly balance: number })[];
      return ok(rows.map((row) => this.mapSummary(row, row.balance)));
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to load debtors", cause));
    }
  }

  public recentlyActive(storeId: string, limit: number): CoreResult<readonly CustomerSummary[]> {
    try {
      const rows = this.connection.sqlite
        .prepare(
          `SELECT c.id, c.name, c.phone, c.notes,
                  COALESCE(SUM(le.debit_minor - le.credit_minor), 0) AS balance,
                  MAX(COALESCE(lt.posted_at, c.updated_at, c.created_at)) AS lastActivity
             FROM customers c
             LEFT JOIN ledger_entries le ON le.account_ref_type = 'customer' AND le.account_ref_id = c.id
             LEFT JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
            WHERE c.store_id = ? AND c.archived_at IS NULL
            GROUP BY c.id
            ORDER BY lastActivity DESC
            LIMIT ?`
        )
        .all(storeId, limit) as (CustomerRow & { readonly balance: number })[];
      return ok(rows.map((row) => this.mapSummary(row, row.balance)));
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_READ_FAILED", "Failed to load recent customers", cause)
      );
    }
  }

  public customersAddedToday(storeId: string, today: string): CoreResult<number> {
    try {
      const row = this.connection.sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM customers WHERE store_id = ? AND substr(created_at, 1, 10) = ?"
        )
        .get(storeId, today) as CountRow;
      return ok(row.count);
    } catch (cause) {
      return err(repositoryError("REPOSITORY_READ_FAILED", "Failed to count customers", cause));
    }
  }

  private customerBaseSql(): string {
    return `
      SELECT c.id, c.name, c.phone, c.email, c.address, c.status,
             c.credit_limit_minor AS creditLimitMinor, c.notes, c.created_at AS createdAt,
             c.updated_at AS updatedAt, c.archived_at AS archivedAt,
             c.created_by_user_id AS createdByUserId, c.updated_by_user_id AS updatedByUserId,
             COALESCE(balance.amount, 0) AS outstandingBalanceMinor,
             last_sale.lastPurchaseAt AS lastPurchaseAt
        FROM customers c
        LEFT JOIN (
          SELECT account_ref_id, SUM(debit_minor - credit_minor) AS amount
            FROM ledger_entries
           WHERE account_ref_type = 'customer'
           GROUP BY account_ref_id
        ) balance ON balance.account_ref_id = c.id
        LEFT JOIN (
          SELECT customer_id, MAX(completed_at) AS lastPurchaseAt
            FROM sales
           WHERE status = 'completed' AND customer_id IS NOT NULL
           GROUP BY customer_id
        ) last_sale ON last_sale.customer_id = c.id`;
  }

  private customerWhere(query: CustomerListQuery): {
    readonly sql: string;
    readonly params: readonly unknown[];
  } {
    const clauses = ["c.store_id = ?"];
    const params: unknown[] = [query.storeId];
    if ((query.status ?? "active") === "active")
      clauses.push("c.archived_at IS NULL AND c.status = 'active'");
    if (query.status === "archived") clauses.push("c.archived_at IS NOT NULL");
    if (query.customerType !== undefined && query.customerType !== "all") {
      clauses.push("c.notes LIKE ?");
      params.push(`%"customerType":"${query.customerType}"%`);
    }
    const search = query.search?.trim().toLowerCase();
    if (search !== undefined && search.length > 0) {
      clauses.push(
        "(lower(c.name) LIKE ? OR lower(COALESCE(c.phone, '')) LIKE ? OR lower(COALESCE(c.email, '')) LIKE ? OR lower(COALESCE(c.notes, '')) LIKE ? OR lower(c.id) LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private customerOrder(query: CustomerListQuery): string {
    const direction = query.sortDirection === "desc" ? "DESC" : "ASC";
    const column: Record<CustomerSortBy, string> = {
      name: "c.name",
      phone: "c.phone",
      city: "c.notes",
      balance: "outstandingBalanceMinor",
      creditLimit: "c.credit_limit_minor",
      lastPurchase: "lastPurchaseAt",
      status: "c.status",
      createdAt: "c.created_at"
    };
    return `ORDER BY ${column[query.sortBy]} ${direction}, c.name ASC`;
  }

  private statementBaseSql(): string {
    return `
      SELECT le.id, lt.posted_at AS date,
             CASE
               WHEN lt.source_type = 'customer_payment' THEN cp.payment_number
               ELSE lt.source_type || ':' || lt.source_id
             END AS reference,
             lt.transaction_type AS transactionType,
             COALESCE(le.memo, lt.memo) AS description,
             le.debit_minor AS debitMinor,
             le.credit_minor AS creditMinor,
             COALESCE(u.display_name, 'System') AS userName
        FROM ledger_entries le
        JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
        LEFT JOIN customer_payments cp ON cp.id = lt.source_id AND lt.source_type = 'customer_payment'
        LEFT JOIN users u ON u.id = lt.posted_by_user_id`;
  }

  private statementWhere(query: CustomerStatementQuery): {
    readonly sql: string;
    readonly params: readonly unknown[];
  } {
    const clauses = ["le.account_ref_type = 'customer'", "le.account_ref_id = ?"];
    const params: unknown[] = [query.customerId];
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
        "(lower(COALESCE(le.memo, lt.memo, '')) LIKE ? OR lower(COALESCE(cp.payment_number, '')) LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`);
    }
    return { sql: `WHERE ${clauses.join(" AND ")}`, params };
  }

  private mapCustomer(row: CustomerRow): CustomerListItem {
    const metadata = this.decodeMetadata(row.notes);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      city: metadata.city,
      cnic: metadata.cnic,
      tags: metadata.tags,
      customerType: metadata.customerType,
      outstandingBalanceMinor: row.outstandingBalanceMinor ?? 0,
      creditLimitMinor: row.creditLimitMinor,
      lastPurchaseAt: row.lastPurchaseAt,
      status: row.archivedAt === null ? "active" : "archived",
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapCustomerDetail(row: CustomerRow): CustomerDetail {
    const metadata = this.decodeMetadata(row.notes);
    return {
      ...this.mapCustomer(row),
      notes: metadata.notes,
      openingBalanceMinor: metadata.openingBalanceMinor,
      openingBalanceDate: metadata.openingBalanceDate,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId
    };
  }

  private mapStatementLine(row: StatementRow, runningBalanceMinor: number): CustomerStatementLine {
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

  private mapSummary(row: CustomerRow, balanceMinor: number): CustomerSummary {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      city: this.decodeMetadata(row.notes).city,
      balanceMinor
    };
  }

  private getRequiredCustomer(id: string): CoreResult<CustomerDetail> {
    const customer = this.getCustomer(id);
    if (!customer.ok) return customer;
    return customer.value === undefined
      ? err(repositoryError("REPOSITORY_NOT_FOUND", "Customer was not found"))
      : ok(customer.value);
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
          "UPDATE customers SET archived_at = ?, updated_at = ?, updated_by_user_id = ? WHERE id = ? AND store_id = ?"
        )
        .run(archived ? timestamp : null, timestamp, input.userId, input.id, input.storeId);
      this.writeAudit(input, archived ? "CustomerArchived" : "CustomerRestored", input.id, {});
      return ok(undefined);
    } catch (cause) {
      return err(
        repositoryError("REPOSITORY_WRITE_FAILED", "Failed to update customer archive state", cause)
      );
    }
  }

  private encodeMetadata(input: CustomerWrite): string {
    const city = input.city?.trim();
    const cnic = input.cnic?.trim();
    const notes = input.notes?.trim();
    return JSON.stringify({
      city: city !== undefined && city.length > 0 ? city : null,
      cnic: cnic !== undefined && cnic.length > 0 ? cnic : null,
      tags: input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
      customerType: input.customerType,
      openingBalanceMinor: input.openingBalanceMinor,
      openingBalanceDate: input.openingBalanceDate ?? null,
      notes: notes !== undefined && notes.length > 0 ? notes : null
    } satisfies CustomerProfileMetadata);
  }

  private decodeMetadata(notes: string | null): CustomerProfileMetadata {
    if (notes === null || notes.trim().length === 0) {
      return defaultMetadata;
    }
    try {
      const value: unknown = JSON.parse(notes);
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return { ...defaultMetadata, notes };
      }
      const parsed = value as Partial<CustomerProfileMetadata>;
      return {
        city: typeof parsed.city === "string" ? parsed.city : null,
        cnic: typeof parsed.cnic === "string" ? parsed.cnic : null,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        customerType:
          parsed.customerType === "walk-in" ||
          parsed.customerType === "regular" ||
          parsed.customerType === "wholesale" ||
          parsed.customerType === "vip"
            ? parsed.customerType
            : "regular",
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
    customerId: string,
    input: CustomerWrite,
    timestamp: string
  ): void {
    const accounts = this.ensureLedgerAccounts(input.storeId, input.userId);
    const transactionId = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_transactions (
          id, store_id, branch_id, business_day_id, source_type, source_id,
          transaction_type, status, posted_at, posted_by_user_id, memo, created_at
        ) VALUES (?, ?, ?, ?, 'customer', ?, 'opening-balance', 'posted', ?, ?, 'Opening customer balance', ?)`
      )
      .run(
        transactionId,
        input.storeId,
        input.branchId,
        input.businessDayId,
        customerId,
        input.openingBalanceDate ?? timestamp,
        input.userId,
        timestamp
      );
    this.insertLedgerEntry(
      transactionId,
      accounts.receivableAccountId,
      "receivable",
      "customer",
      customerId,
      Math.max(0, input.openingBalanceMinor),
      Math.max(0, -input.openingBalanceMinor),
      "Opening balance"
    );
  }

  private ensureLedgerAccounts(
    storeId: string,
    userId: string
  ): { readonly cashAccountId: string; readonly receivableAccountId: string } {
    const timestamp = new Date().toISOString();
    const cashAccountId = this.ensureLedgerAccount(
      storeId,
      "1000",
      "Cash",
      "asset",
      userId,
      timestamp
    );
    const receivableAccountId = this.ensureLedgerAccount(
      storeId,
      "1100",
      "Customer Receivables",
      "asset",
      userId,
      timestamp
    );
    return { cashAccountId, receivableAccountId };
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

  private ensureCashAccount(input: CustomerPaymentWrite): string {
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

  private ensurePaymentMethod(input: CustomerPaymentWrite): string {
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
      .prepare("SELECT COUNT(*) AS count FROM customer_payments WHERE branch_id = ?")
      .get(branchId) as CountRow;
    return `CR-${String(row.count + 1).padStart(6, "0")}`;
  }

  private paymentMethodName(method: CustomerPaymentWrite["paymentMethod"]): string {
    const names: Record<CustomerPaymentWrite["paymentMethod"], string> = {
      cash: "Cash",
      bank: "Bank",
      jazzcash: "JazzCash",
      easypaisa: "EasyPaisa",
      card: "Card"
    };
    return names[method];
  }

  private paymentNotes(input: CustomerPaymentWrite): string | null {
    const details = {
      referenceNumber: input.referenceNumber ?? null,
      notes: input.notes ?? null
    };
    return JSON.stringify(details);
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
        ) VALUES (?, ?, ?, ?, ?, ?, 'customer', ?, ?, ?, ?)`
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
