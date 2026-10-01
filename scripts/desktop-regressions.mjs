import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { openDesktop } from "./desktop-harness.mjs";
const directory = process.env.ORIX_TEST_DIRECTORY;
if (!directory) throw new Error("A disposable ORIX_TEST_DIRECTORY is required.");
const desktop = await openDesktop(directory);
const require = createRequire(new URL("../apps/desktop/package.json", import.meta.url));
const Database = require("better-sqlite3");
const db = new Database(join(directory, "orix-retail-os.sqlite"));
after(() => {
  if (db.open) db.close();
  desktop.close();
});
const ok = async (name, payload) => {
  const r = await desktop.call(name, payload);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value;
};
const login = () =>
  ok("auth.login", { username: "owner", password: "DemoOwner!2026", rememberMe: false });
const sale = async (overrides = {}) => {
  const p = (
    await ok("products.list", {
      page: 1,
      pageSize: 10,
      sortBy: "name",
      sortDirection: "asc",
      status: "active"
    })
  ).items.find((p) => p.currentStock > 5);
  return {
    saleDate: new Date().toISOString(),
    paymentType: "cash",
    discountMinor: 0,
    taxMinor: 0,
    cashReceivedMinor: 1000,
    items: [
      {
        productId: p.id,
        unitId: p.unitId,
        quantity: 1,
        unitPriceMinor: 1000,
        discountMinor: 0,
        taxMinor: 0
      }
    ],
    ...overrides
  };
};
test("customer and supplier notes decode empty metadata without exposing JSON", async () => {
  await login();
  for (const table of ["customers", "suppliers"]) {
    const row = db.prepare(`SELECT id, notes FROM ${table} LIMIT 1`).get();
    try {
      for (const [stored, expected] of [
        [JSON.stringify({ city: "Karachi", tags: [], notes: null }), null],
        [JSON.stringify({ city: "Karachi", tags: [] }), null],
        [
          JSON.stringify({ city: "Karachi", notes: "Call before delivery" }),
          "Call before delivery"
        ],
        ["Legacy plain note", "Legacy plain note"]
      ]) {
        db.prepare(`UPDATE ${table} SET notes=? WHERE id=?`).run(stored, row.id);
        const detail = await ok(`${table}.get`, { id: row.id });
        assert.equal(detail.notes, expected);
      }
    } finally {
      db.prepare(`UPDATE ${table} SET notes=? WHERE id=?`).run(row.notes, row.id);
    }
  }
});

test("setup cannot reset an initialized store", async () => {
  await login();
  const r = await desktop.call("setup.store", {
    storeName: "Replaced",
    businessName: "Test",
    ownerName: "Test",
    phone: "",
    email: "",
    address: "",
    logoDataUrl: null,
    currency: "PKR",
    timezone: "Asia/Karachi",
    taxEnabled: false,
    branchName: "Main",
    adminFullName: "Owner",
    username: "owner",
    password: "DemoOwner!2026",
    confirmPassword: "DemoOwner!2026",
    pin: "2468"
  });
  assert.equal(r.ok, false);
});
test("logout protects reads and mutations", async () => {
  await login();
  await ok("auth.logout");
  assert.equal((await desktop.call("users.list", {})).ok, false);
  assert.equal((await desktop.call("products.catalog", {})).ok, false);
});
test("viewer cannot change catalog", async () => {
  await ok("auth.login", { username: "viewer", password: "DemoViewer!2026", rememberMe: false });
  assert.equal(
    (
      await desktop.call("products.catalog.save", {
        kind: "category",
        name: "Forbidden",
        active: true
      })
    ).ok,
    false
  );
});
test("cashier cannot change store settings", async () => {
  await ok("auth.login", { username: "cashier", password: "DemoCashier!2026", rememberMe: false });
  assert.equal(
    (
      await desktop.call("settings.save", {
        theme: "light",
        storeDisplayName: "Forbidden",
        receiptHeader: "",
        receiptFooter: "",
        backupLocation: ""
      })
    ).ok,
    false
  );
});
test("overpayment contributes sale total to cash, not total minus change", async () => {
  await login();
  const before = (await ok("cash-register.summary")).expectedCashMinor;
  await ok("sales.complete", await sale({ cashReceivedMinor: 1500 }));
  const after = (await ok("cash-register.summary")).expectedCashMinor;
  assert.equal(after - before, 1000);
});
test("successive multi-item returns update status, net sales, drawer and stock", async () => {
  await login();
  const products = (
    await ok("products.list", {
      page: 1,
      pageSize: 100,
      sortBy: "name",
      sortDirection: "asc",
      status: "active"
    })
  ).items
    .filter((p) => p.currentStock > 5)
    .slice(0, 2);
  const input = await sale({
    saleDate: "2000-01-01T12:00:00.000Z",
    discountMinor: 101,
    taxMinor: 38,
    cashReceivedMinor: 2937,
    items: products.map((p) => ({
      productId: p.id,
      unitId: p.unitId,
      quantity: 2,
      unitPriceMinor: 750,
      discountMinor: 0,
      taxMinor: 0
    }))
  });
  const beforePeriod = await ok("reports.summary", {
    dateFrom: "2020-01-01",
    dateTo: "2030-01-01"
  });
  const beforeDashboard = await ok("dashboard.get");
  const completed = await ok("sales.complete", input);
  const id = completed.sale.id;
  const stock = (productId) =>
    db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN direction='in' THEN quantity ELSE -quantity END),0) AS qty FROM inventory_transactions WHERE product_id=? AND status='posted'"
      )
      .get(productId).qty;
  const beforeStock = products.map((p) => stock(p.id));
  const beforeCash = (await ok("cash-register.summary")).expectedCashMinor;
  const first = await ok("sales.return", {
    saleId: id,
    reason: "Partial restock",
    refundMethod: "cash",
    items: [{ saleItemId: completed.sale.items[0].id, quantity: 1, condition: "sellable" }]
  });
  const partial = await ok("sales.get", { id });
  assert.equal(partial.returnStatus, "partial");
  assert.equal(partial.refundedMinor, first.return.totalRefundMinor);
  assert.equal(partial.netTotalMinor, 2937 - first.return.totalRefundMinor);
  assert.equal(stock(products[0].id), beforeStock[0] + 1);
  const partialReceipt = await ok("sales.receipt", { saleId: id });
  assert.equal(partialReceipt.totalMinor, partial.netTotalMinor);
  assert.equal(partialReceipt.items[0].quantity, 1);
  assert.equal(
    partialReceipt.items.reduce((sum, item) => sum + item.lineTotalMinor, 0),
    partial.netTotalMinor
  );
  assert.equal(partialReceipt.cashRefundMinor, first.return.totalRefundMinor);
  assert.equal(
    (await ok("counter.summary")).expectedCashMinor,
    beforeCash - first.return.totalRefundMinor
  );
  const second = await ok("sales.return", {
    saleId: id,
    reason: "Remaining damaged",
    refundMethod: "cash",
    items: completed.sale.items.map((item, i) => ({
      saleItemId: item.id,
      quantity: i === 0 ? 1 : 2,
      condition: "damaged"
    }))
  });
  assert.equal(first.return.totalRefundMinor + second.return.totalRefundMinor, 2937);
  const full = await ok("sales.get", { id });
  assert.equal(full.returnStatus, "full");
  assert.equal(full.totalMinor, 2937);
  assert.equal(full.netTotalMinor, 0);
  const fullReceipt = await ok("sales.receipt", { saleId: id });
  assert.equal(fullReceipt.totalMinor, 0);
  assert.equal(fullReceipt.items.length, 0);
  assert.equal(fullReceipt.paidMinor, 0);
  assert.equal(stock(products[1].id), beforeStock[1]);
  assert.equal((await ok("cash-register.summary")).expectedCashMinor, beforeCash - 2937);
  assert.equal((await ok("dashboard.get")).todaySalesMinor, beforeDashboard.todaySalesMinor);
  const reports = await ok("reports.summary", { dateFrom: "2020-01-01", dateTo: "2030-01-01" });
  assert.equal(
    reports.totals.salesMinor,
    reports.totals.grossSalesMinor - reports.totals.returnsMinor
  );
  assert.equal(
    reports.dailySales.some((row) => row.saleId === id),
    false
  );
  assert.equal(reports.totals.salesMinor, beforePeriod.totals.salesMinor - 2937);
  const originalPeriod = await ok("reports.summary", {
    dateFrom: "2000-01-01",
    dateTo: "2000-01-01"
  });
  assert.equal(originalPeriod.dailySales.find((row) => row.saleId === id).netTotalMinor, 0);
});

test("credit return reduces customer balance without changing drawer cash", async () => {
  await login();
  const customerId = db
    .prepare("SELECT id FROM customers WHERE archived_at IS NULL LIMIT 1")
    .get().id;
  const balance = () =>
    db
      .prepare(
        "SELECT COALESCE(SUM(debit_minor-credit_minor),0) AS amount FROM ledger_entries WHERE account_ref_type='customer' AND account_ref_id=?"
      )
      .get(customerId).amount;
  const beforeBalance = balance();
  const beforeCash = (await ok("cash-register.summary")).expectedCashMinor;
  const completed = await ok(
    "sales.complete",
    await sale({ customerId, paymentType: "credit", cashReceivedMinor: 0 })
  );
  assert.equal(balance(), beforeBalance + 1000);
  await ok("sales.return", {
    saleId: completed.sale.id,
    reason: "Credit balance reversal",
    refundMethod: "customer-credit",
    items: [{ saleItemId: completed.sale.items[0].id, quantity: 1, condition: "sellable" }]
  });
  assert.equal(balance(), beforeBalance);
  assert.equal((await ok("cash-register.summary")).expectedCashMinor, beforeCash);
});

test("discounted return refunds net paid amount and reduces drawer cash", async () => {
  await login();
  const original = await ok(
    "sales.complete",
    await sale({ discountMinor: 200, cashReceivedMinor: 800 })
  );
  const before = (await ok("cash-register.summary")).expectedCashMinor;
  const returned = await ok("sales.return", {
    saleId: original.sale.id,
    reason: "Regression return",
    refundMethod: "cash",
    items: [{ saleItemId: original.sale.items[0].id, quantity: 1, condition: "sellable" }]
  });
  assert.equal(returned.return.totalRefundMinor, 800);
  assert.equal((await ok("cash-register.summary")).expectedCashMinor - before, -800);
});
test("simultaneous mutations both persist independently", async () => {
  await login();
  const r = await Promise.all([
    desktop.call("products.catalog.save", {
      kind: "category",
      name: "Concurrent one",
      active: true
    }),
    desktop.call("products.catalog.save", {
      kind: "category",
      name: "Concurrent two",
      active: true
    })
  ]);
  assert.deepEqual(
    r.map((x) => x.ok),
    [true, true]
  );
});
test("backup validation rejects a stores-only database", async () => {
  await login();
  const file = join(directory, "incomplete.sqlite");
  const b = new Database(file);
  b.exec("CREATE TABLE stores(id TEXT); INSERT INTO stores VALUES ('fake')");
  b.close();
  assert.equal((await ok("backups.verify", { filePath: file })).valid, false);
});
test("event persistence failure rolls back completed sale", async () => {
  await login();
  const payload = await sale();
  const before = db.prepare("SELECT COUNT(*) n FROM sales").get().n;
  db.exec(
    "CREATE TRIGGER reject_event BEFORE INSERT ON business_events BEGIN SELECT RAISE(ABORT,'injected failure'); END"
  );
  try {
    assert.equal((await desktop.call("sales.complete", payload)).ok, false);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM sales").get().n, before);
  } finally {
    db.exec("DROP TRIGGER reject_event");
  }
});
test("retrying the same checkout returns the original sale without posting twice", async () => {
  await login();
  const payload = await sale({ operationId: crypto.randomUUID() });
  const before = (await ok("cash-register.summary")).expectedCashMinor;
  const first = await ok("sales.complete", payload);
  const second = await ok("sales.complete", payload);
  assert.equal(second.sale.id, first.sale.id);
  assert.equal((await ok("cash-register.summary")).expectedCashMinor - before, 1000);
  assert.equal(
    (await desktop.call("sales.complete", { ...payload, discountMinor: 100 })).ok,
    false
  );
});
test("sales reports include every sale beyond 500 records", async () => {
  await login();
  const original = (await ok("sales.complete", await sale())).sale;
  const row = db.prepare("SELECT * FROM sales WHERE id=?").get(original.id);
  const keys = Object.keys(row);
  const insert = db.prepare(
    `INSERT INTO sales (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`
  );
  db.transaction(() => {
    for (let i = 0; i < 501; i++) {
      const copy = { ...row, id: crypto.randomUUID(), sale_number: `REPORT-${i}` };
      insert.run(...keys.map((k) => copy[k]));
    }
  })();
  const range = {
    dateFrom: "1990-01-01",
    dateTo: "2100-01-01"
  };
  const report = await ok("reports.summary", range);
  const count = db.prepare("SELECT COUNT(*) n FROM sales WHERE status='completed'").get().n;
  assert.equal(report.dailySales.length, count);
});
test("exact barcode lookup reaches products beyond the first catalog page", async () => {
  await login();
  const target = db
    .prepare("SELECT barcode FROM products ORDER BY name LIMIT 1 OFFSET 550")
    .get().barcode;
  const found = await ok("products.list", {
    page: 1,
    pageSize: 1,
    sortBy: "name",
    sortDirection: "asc",
    status: "active",
    barcode: target
  });
  assert.equal(found.items[0]?.barcode, target);
  assert.equal(found.totalItems, 1);
});
test("noncash customer and supplier payments do not change drawer cash", async () => {
  await login();
  const before = (await ok("cash-register.summary")).expectedCashMinor;
  const customerId = db.prepare("SELECT id FROM customers LIMIT 1").get().id;
  const supplierId = db.prepare("SELECT id FROM suppliers LIMIT 1").get().id;
  await ok("customers.payment.record", {
    customerId,
    amountMinor: 100,
    paymentMethod: "bank",
    paidAt: new Date().toISOString()
  });
  assert.equal((await ok("cash-register.summary")).expectedCashMinor, before);
  await ok("suppliers.payment.record", {
    supplierId,
    amountMinor: 100,
    paymentMethod: "card",
    paidAt: new Date().toISOString()
  });
  assert.equal((await ok("cash-register.summary")).expectedCashMinor, before);
});
test("repeated payments have distinct events and event failure rolls back supplier payment", async () => {
  await login();
  for (const [party, table, event] of [
    ["supplier", "suppliers", "SupplierPaymentRecorded"],
    ["customer", "customers", "CustomerPaymentReceived"]
  ]) {
    const id = db.prepare(`SELECT id FROM ${table} LIMIT 1`).get().id;
    const payload = {
      [`${party}Id`]: id,
      amountMinor: 100,
      paymentMethod: "bank",
      paidAt: new Date().toISOString()
    };
    const count = () => db.prepare(`SELECT COUNT(*) n FROM ${party}_payments`).get().n;
    const before = count();
    for (let i = 0; i < 2; i++) {
      const result = await ok(`${table}.payment.record`, payload);
      assert.equal(
        db
          .prepare("SELECT COUNT(*) n FROM business_events WHERE event_name=? AND source_id=?")
          .get(event, result.payment.id).n,
        1
      );
    }
    assert.equal(count(), before + 2);
  }
  const beforePayments = db.prepare("SELECT COUNT(*) n FROM supplier_payments").get().n;
  const beforeEntries = db.prepare("SELECT COUNT(*) n FROM ledger_entries").get().n;
  db.exec(
    "CREATE TRIGGER reject_payment_event BEFORE INSERT ON business_events BEGIN SELECT RAISE(ABORT,'injected failure'); END"
  );
  try {
    const supplierId = db.prepare("SELECT id FROM suppliers LIMIT 1").get().id;
    assert.equal(
      (
        await desktop.call("suppliers.payment.record", {
          supplierId,
          amountMinor: 100,
          paymentMethod: "bank",
          paidAt: new Date().toISOString()
        })
      ).ok,
      false
    );
    assert.equal(db.prepare("SELECT COUNT(*) n FROM supplier_payments").get().n, beforePayments);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ledger_entries").get().n, beforeEntries);
  } finally {
    db.exec("DROP TRIGGER reject_payment_event");
  }
});
test("payment retries reuse the original posting and reject changed amounts", async () => {
  await login();
  for (const party of ["customer", "supplier"]) {
    const id = db.prepare(`SELECT id FROM ${party}s LIMIT 1`).get().id;
    const payload = {
      [`${party}Id`]: id,
      operationId: crypto.randomUUID(),
      amountMinor: 100,
      paymentMethod: "bank",
      paidAt: new Date().toISOString()
    };
    const before = db.prepare(`SELECT COUNT(*) n FROM ${party}_payments`).get().n;
    const first = await ok(`${party}s.payment.record`, payload);
    const second = await ok(`${party}s.payment.record`, payload);
    assert.equal(second.payment.id, first.payment.id);
    assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${party}_payments`).get().n, before + 1);
    assert.equal(
      (await desktop.call(`${party}s.payment.record`, { ...payload, amountMinor: 200 })).ok,
      false
    );
  }
});
test("customer and supplier details can be edited repeatedly", async () => {
  await login();
  for (const party of ["customer", "supplier"]) {
    const id = db.prepare(`SELECT id FROM ${party}s LIMIT 1`).get().id;
    for (let i = 0; i < 2; i++) {
      const current = await ok(`${party}s.get`, { id });
      await ok(`${party}s.save`, {
        ...current,
        id,
        notes: `Repeated edit ${i}`,
        expectedUpdatedAt: current.updatedAt
      });
    }
  }
});
test("home drawer matches the ledger after refunds and change", async () => {
  await login();
  assert.equal(
    (await ok("dashboard.get")).cashInDrawerMinor,
    (await ok("cash-register.summary")).expectedCashMinor
  );
});
test("unpaid credit sales cannot be refunded as cash", async () => {
  await login();
  const customerId = db.prepare("SELECT id FROM customers LIMIT 1").get().id;
  const original = await ok(
    "sales.complete",
    await sale({ customerId, paymentType: "credit", cashReceivedMinor: 0 })
  );
  const before = (await ok("cash-register.summary")).expectedCashMinor;
  assert.equal(
    (
      await desktop.call("sales.return", {
        saleId: original.sale.id,
        reason: "Unpaid credit return",
        refundMethod: "cash",
        items: [{ saleItemId: original.sale.items[0].id, quantity: 1, condition: "sellable" }]
      })
    ).ok,
    false
  );
  assert.equal((await ok("cash-register.summary")).expectedCashMinor, before);
});
test("cannot disable the last owner or grant owner access as manager", async () => {
  await login();
  const owner = (await ok("users.list", {})).users.find((u) => u.username === "owner");
  assert.equal(
    (
      await desktop.call("users.save", {
        id: owner.id,
        fullName: owner.fullName,
        username: owner.username,
        status: "disabled",
        roleNames: ["Owner"]
      })
    ).ok,
    false
  );
  await ok("users.save", {
    username: "manager",
    fullName: "Demo Manager",
    status: "active",
    roleNames: ["Manager"],
    password: "DemoManager!2026",
    pin: "4567"
  });
  await ok("auth.login", { username: "manager", password: "DemoManager!2026" });
  assert.equal(
    (
      await desktop.call("users.save", {
        username: "newowner",
        fullName: "Unauthorized Owner",
        status: "active",
        roleNames: ["Owner"],
        password: "NewOwner!2026",
        pin: "4567"
      })
    ).ok,
    false
  );
  assert.equal(
    (await desktop.call("users.reset-secret", { userId: owner.id, password: "ChangedOwner!2026" }))
      .ok,
    false
  );
  await login();
});
test("checkout rejects duplicate product rows and invalid payment totals", async () => {
  await login();
  const input = await sale();
  const customerId = db.prepare("SELECT id FROM customers LIMIT 1").get().id;
  assert.equal(
    (
      await desktop.call("sales.complete", {
        ...input,
        items: [input.items[0], input.items[0]],
        cashReceivedMinor: 2000
      })
    ).ok,
    false
  );
  assert.equal(
    (
      await desktop.call("sales.complete", {
        ...input,
        customerId,
        paymentType: "credit",
        cashReceivedMinor: 500
      })
    ).ok,
    false
  );
  assert.equal(
    (await desktop.call("sales.complete", { ...input, paymentType: "made-up" })).ok,
    false
  );
  assert.equal(
    (
      await desktop.call("sales.complete", {
        ...input,
        items: [{ ...input.items[0], quantity: 0.3333 }]
      })
    ).ok,
    false
  );
});
test("counter opening, expense, variance and closing reconcile with cash", async () => {
  await login();
  const current = await ok("counter.summary");
  if (current.session === null) await ok("counter.open", { openingCashMinor: 20000 });
  const before = (await ok("counter.summary")).expectedCashMinor;
  await ok("counter.expense", {
    amountMinor: 500,
    description: "Delivery charge",
    operationId: crypto.randomUUID()
  });
  const after = await ok("counter.summary");
  assert.equal(after.expectedCashMinor, before - 500);
  assert.equal(after.expenses[0].description, "Delivery charge");
  assert.equal(
    (
      await desktop.call("counter.close", {
        countedCashMinor: after.expectedCashMinor - 100,
        reason: ""
      })
    ).ok,
    false
  );
  await ok("counter.close", {
    countedCashMinor: after.expectedCashMinor - 100,
    reason: "Counted short at end of day"
  });
  assert.equal((await ok("counter.summary")).session.status, "closed");
  assert.equal(
    (
      await desktop.call("counter.expense", {
        amountMinor: 100,
        description: "After closing",
        operationId: crypto.randomUUID()
      })
    ).ok,
    false
  );
});

test("closed counter rejects new financial postings", async () => {
  await login();
  assert.equal((await desktop.call("sales.complete", await sale())).ok, false);
});

test("owner can reopen today's counter without duplicating cash and retains closing evidence", async () => {
  await login();
  const before = await ok("counter.summary");
  const payload = {
    sessionId: before.session.id,
    closedAt: before.session.closedAt,
    reason: "Accidental early closure"
  };
  assert.equal((await desktop.call("counter.reopen", { ...payload, reason: "" })).ok, false);
  await ok("auth.login", { username: "cashier", password: "DemoCashier!2026" });
  assert.equal((await desktop.call("counter.reopen", payload)).ok, false);
  await login();
  const day = db
    .prepare(
      "SELECT id,business_date FROM business_days WHERE id=(SELECT business_day_id FROM cash_sessions WHERE id=?)"
    )
    .get(payload.sessionId);
  db.prepare("UPDATE business_days SET business_date='2000-01-01' WHERE id=?").run(day.id);
  try {
    assert.equal((await desktop.call("counter.reopen", payload)).ok, false);
  } finally {
    // The IPC guard creates today's empty day when the fixture is moved into history.
    db.prepare(
      "DELETE FROM business_days WHERE business_date=? AND branch_id=(SELECT branch_id FROM business_days WHERE id=?) AND id<>?"
    ).run(day.business_date, day.id, day.id);
    db.prepare("UPDATE business_days SET business_date=? WHERE id=?").run(
      day.business_date,
      day.id
    );
  }
  db.exec(
    "CREATE TRIGGER fail_reopen_audit BEFORE INSERT ON audit_logs WHEN NEW.action='CounterReopened' BEGIN SELECT RAISE(ABORT,'audit failure'); END;"
  );
  assert.equal((await desktop.call("counter.reopen", payload)).ok, false);
  assert.equal((await ok("counter.summary")).session.status, "closed");
  db.exec("DROP TRIGGER fail_reopen_audit");
  const sessions = db.prepare("SELECT count(*) AS n FROM cash_sessions").get().n;
  const reopened = await ok("counter.reopen", payload);
  assert.equal(reopened.session.status, "open");
  assert.equal(reopened.session.id, before.session.id);
  assert.equal(reopened.session.openingCashMinor, before.session.openingCashMinor);
  assert.equal(reopened.expectedCashMinor, before.expectedCashMinor);
  assert.equal(db.prepare("SELECT count(*) AS n FROM cash_sessions").get().n, sessions);
  const audit = JSON.parse(
    db
      .prepare(
        "SELECT metadata_json FROM audit_logs WHERE action='CounterReopened' ORDER BY occurred_at DESC LIMIT 1"
      )
      .get().metadata_json
  );
  assert.equal(audit.previousClosing.countedCashMinor, before.session.countedCashMinor);
  assert.equal(audit.previousClosing.closedAt, before.session.closedAt);
  await ok("counter.close", {
    countedCashMinor: reopened.expectedCashMinor,
    reason: "Final closing after reopening"
  });
  assert.equal((await desktop.call("counter.reopen", payload)).ok, false);
});

test("backup verification rejects missing uniqueness constraints", async () => {
  await login();
  const backup = await ok("backups.create");
  const altered = new Database(backup.filePath);
  altered.exec("DROP INDEX products_store_barcode_unique");
  altered.close();
  assert.equal((await ok("backups.verify", { filePath: backup.filePath })).valid, false);
});
test("diagnostics export is restricted and renderer reports are rate limited", async () => {
  await ok("auth.login", { username: "cashier", password: "DemoCashier!2026" });
  assert.equal((await desktop.call("diagnostics.export")).ok, false);
  assert.equal((await desktop.call("diagnostics.status")).ok, false);
  const notice = await ok("diagnostics.notice");
  assert.equal(typeof notice.loggingAvailable, "boolean");
  assert.equal("buildId" in notice, false);
  for (let i = 0; i < 20; i++)
    assert.equal(
      (await ok("diagnostics.report", { kind: "error", name: "Error", stack: "customer=PRIVATE" }))
        .recorded,
      true
    );
  assert.equal((await ok("diagnostics.report", { kind: "error" })).recorded, false);
  await login();
  assert.equal((await ok("diagnostics.status")).loggingAvailable, true);
});
test("verified restore replaces the database and preserves a safety backup", async () => {
  await login();
  const backup = await ok("backups.create");
  assert.equal((await ok("backups.verify", { filePath: backup.filePath })).valid, true);
  await ok("products.catalog.save", { kind: "category", name: "After backup only", active: true });
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM categories WHERE name='After backup only'").get().n,
    1
  );
  db.close();
  const restored = await ok("backups.restore", {
    filePath: backup.filePath,
    confirmation: "RESTORE"
  });
  assert.equal(restored.restored, true);
  const check = new Database(join(directory, "orix-retail-os.sqlite"), { readonly: true });
  try {
    assert.equal(check.pragma("integrity_check", { simple: true }), "ok");
    assert.equal(
      check.prepare("SELECT COUNT(*) n FROM categories WHERE name='After backup only'").get().n,
      0
    );
  } finally {
    check.close();
  }
  const safety = new Database(restored.safetyBackupPath, { readonly: true });
  try {
    assert.equal(
      safety.prepare("SELECT COUNT(*) n FROM categories WHERE name='After backup only'").get().n,
      1
    );
  } finally {
    safety.close();
  }
  assert.equal((await desktop.call("products.catalog", {})).ok, false);
});
