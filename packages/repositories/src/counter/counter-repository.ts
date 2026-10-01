import { randomUUID } from "node:crypto";
import type { RepositoryConnection } from "../shared/repository-factory.js";

export type CounterActor = {
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
};
export type CounterSession = {
  readonly id: string;
  readonly status: "open" | "closed";
  readonly openingCashMinor: number;
  readonly expectedCashMinor: number | null;
  readonly countedCashMinor: number | null;
  readonly varianceMinor: number | null;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly notes: string | null;
};
export type CounterExpense = {
  readonly id: string;
  readonly description: string;
  readonly amountMinor: number;
  readonly expenseDate: string;
  readonly status: string;
};
export class CounterRepository {
  public constructor(private readonly connection: RepositoryConnection) {}
  public session(dayId: string): CounterSession | undefined {
    return this.connection.sqlite
      .prepare(
        `SELECT id,status,opening_cash_minor AS openingCashMinor,expected_cash_minor AS expectedCashMinor,counted_cash_minor AS countedCashMinor,variance_minor AS varianceMinor,opened_at AS openedAt,closed_at AS closedAt,notes FROM cash_sessions WHERE business_day_id=? ORDER BY opened_at DESC LIMIT 1`
      )
      .get(dayId) as CounterSession | undefined;
  }
  public expenses(dayId: string): readonly CounterExpense[] {
    return this.connection.sqlite
      .prepare(
        `SELECT id,description,amount_minor AS amountMinor,expense_date AS expenseDate,status FROM expenses WHERE business_day_id=? ORDER BY created_at DESC`
      )
      .all(dayId) as CounterExpense[];
  }
  public expenseByNumber(storeId: string, number: string): CounterExpense | undefined {
    return this.connection.sqlite
      .prepare(
        `SELECT id,description,amount_minor AS amountMinor,expense_date AS expenseDate,status FROM expenses WHERE store_id=? AND expense_number=?`
      )
      .get(storeId, number) as CounterExpense | undefined;
  }
  public open(actor: CounterActor, openingCashMinor: number): void {
    const timestamp = new Date().toISOString();
    const accountId = this.cashAccount(actor);
    this.connection.sqlite
      .prepare(
        `INSERT INTO cash_sessions(id,cash_account_id,business_day_id,opened_at,opened_by_user_id,opening_cash_minor,status) VALUES (?,?,?,?,?,?,'open')`
      )
      .run(randomUUID(), accountId, actor.businessDayId, timestamp, actor.userId, openingCashMinor);
    this.connection.sqlite
      .prepare("UPDATE business_days SET status='open' WHERE id=?")
      .run(actor.businessDayId);
    this.audit(actor, "CounterOpened", { openingCashMinor });
  }
  public close(
    actor: CounterActor,
    sessionId: string,
    expected: number,
    counted: number,
    reason: string
  ): void {
    const timestamp = new Date().toISOString();
    this.connection.sqlite
      .prepare(
        `UPDATE cash_sessions SET status='closed',closed_at=?,closed_by_user_id=?,expected_cash_minor=?,counted_cash_minor=?,variance_minor=?,notes=? WHERE id=? AND status='open'`
      )
      .run(timestamp, actor.userId, expected, counted, counted - expected, reason, sessionId);
    this.connection.sqlite
      .prepare(
        "UPDATE business_days SET status='closed',closed_at=?,closed_by_user_id=? WHERE id=?"
      )
      .run(timestamp, actor.userId, actor.businessDayId);
    this.audit(actor, "CounterClosed", {
      expectedCashMinor: expected,
      countedCashMinor: counted,
      varianceMinor: counted - expected,
      reason
    });
  }
  public reopen(actor: CounterActor, session: CounterSession, reason: string): void {
    this.audit(actor, "CounterReopened", { reason, previousClosing: session });
    const result = this.connection.sqlite
      .prepare(
        "UPDATE cash_sessions SET status='open',closed_at=NULL,closed_by_user_id=NULL,expected_cash_minor=NULL,counted_cash_minor=NULL,variance_minor=NULL,notes=NULL WHERE id=? AND business_day_id=? AND status='closed' AND closed_at=?"
      )
      .run(session.id, actor.businessDayId, session.closedAt);
    if (result.changes !== 1) throw new Error("Counter changed. Refresh before reopening.");
    this.connection.sqlite
      .prepare(
        "UPDATE business_days SET status='open',closed_at=NULL,closed_by_user_id=NULL,expected_cash_minor=NULL,counted_cash_minor=NULL,cash_variance_minor=NULL WHERE id=?"
      )
      .run(actor.businessDayId);
  }
  public postExpense(
    actor: CounterActor,
    number: string,
    description: string,
    amountMinor: number
  ): void {
    const timestamp = new Date().toISOString();
    const id = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT OR IGNORE INTO expense_categories(id,store_id,name,code,status,created_at) VALUES (?,?,'General operating expense','GENERAL','active',?)`
      )
      .run(randomUUID(), actor.storeId, timestamp);
    const category = this.connection.sqlite
      .prepare("SELECT id FROM expense_categories WHERE store_id=? AND code='GENERAL'")
      .get(actor.storeId) as { id: string };
    this.connection.sqlite
      .prepare(
        `INSERT INTO expenses(id,store_id,branch_id,business_day_id,expense_category_id,cash_account_id,expense_number,description,amount_minor,status,expense_date,posted_at,created_at,created_by_user_id,posted_by_user_id) VALUES (?,?,?,?,?,?,?,?,?,'recorded',?,?,?,?,?)`
      )
      .run(
        id,
        actor.storeId,
        actor.branchId,
        actor.businessDayId,
        category.id,
        this.cashAccount(actor),
        number,
        description,
        amountMinor,
        timestamp,
        timestamp,
        timestamp,
        actor.userId,
        actor.userId
      );
    this.postLedger(actor, id, description, amountMinor, timestamp);
    this.audit(actor, "ExpenseRecorded", { expenseId: id, description, amountMinor });
  }
  private cashAccount(actor: CounterActor): string {
    const row = this.connection.sqlite
      .prepare("SELECT id FROM cash_accounts WHERE branch_id=? AND name='Main Cash Drawer'")
      .get(actor.branchId) as { id: string } | undefined;
    if (row) return row.id;
    const id = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO cash_accounts(id,store_id,branch_id,name,account_type,status,currency_code,created_at) VALUES (?,?,?,'Main Cash Drawer','cash_drawer','active','PKR',?)`
      )
      .run(id, actor.storeId, actor.branchId, new Date().toISOString());
    return id;
  }
  private postLedger(
    actor: CounterActor,
    id: string,
    description: string,
    amount: number,
    timestamp: string
  ): void {
    const transactionId = randomUUID();
    this.connection.sqlite
      .prepare(
        `INSERT INTO ledger_transactions(id,store_id,branch_id,business_day_id,source_type,source_id,transaction_type,status,posted_at,posted_by_user_id,memo,created_at) VALUES (?,?,?,?,'expense',?,'expense','posted',?,?,?,?)`
      )
      .run(
        transactionId,
        actor.storeId,
        actor.branchId,
        actor.businessDayId,
        id,
        timestamp,
        actor.userId,
        description,
        timestamp
      );
    for (const [code, name, type, debit, credit] of [
      ["1000", "Cash", "cash", 0, amount],
      ["5000", "Operating expenses", "expense", amount, 0]
    ] as const) {
      this.connection.sqlite
        .prepare(
          `INSERT OR IGNORE INTO ledger_accounts(id,store_id,code,name,account_type,status,created_at) VALUES (?,?,?,?,?,'active',?)`
        )
        .run(
          randomUUID(),
          actor.storeId,
          code,
          name,
          type === "cash" ? "asset" : "expense",
          timestamp
        );
      const account = this.connection.sqlite
        .prepare("SELECT id FROM ledger_accounts WHERE store_id=? AND code=?")
        .get(actor.storeId, code) as { id: string };
      this.connection.sqlite
        .prepare(
          `INSERT INTO ledger_entries(id,ledger_transaction_id,ledger_account_id,entry_type,account_type,debit_minor,credit_minor,currency_code,memo,created_at) VALUES (?,?,?,?,?,?,?,'PKR',?,?)`
        )
        .run(
          randomUUID(),
          transactionId,
          account.id,
          "normal",
          type,
          debit,
          credit,
          description,
          timestamp
        );
    }
  }
  private audit(actor: CounterActor, action: string, metadata: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    this.connection.sqlite
      .prepare(
        `INSERT INTO audit_logs(id,store_id,branch_id,business_day_id,actor_user_id,action,target_type,target_id,metadata_json,occurred_at,created_at) VALUES (?,?,?,?,?,?,'counter',?,?,?,?)`
      )
      .run(
        randomUUID(),
        actor.storeId,
        actor.branchId,
        actor.businessDayId,
        actor.userId,
        action,
        actor.businessDayId,
        JSON.stringify(metadata),
        timestamp,
        timestamp
      );
  }
}
