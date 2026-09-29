# Production readiness audit — 23 September 2026

> Subsequent implementation: see [single-counter handoff](single-counter-handoff-2026-09-23.md) for fixes, testing accounts, verification, and remaining release gates. Findings below describe the baseline.

**Decision: not ready for production or a shop beta with real records.** The application has substantial working functionality, but reproduced authorization, refund, cash reconciliation, and backup-validation defects are release blockers. Passing the existing tests does not establish operational safety.

Audited HEAD: `1e3e973`, including the pre-existing working-tree change in `apps/desktop/src/renderer/index.tsx`. No application source was changed by this audit. Findings distinguish runtime reproductions from source inspection; this is not Windows certification or an exhaustive penetration test.

## Verification performed

| Check                                 | Result                                                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                           | Passed as part of `pnpm check`.                                                                                                                                                                                     |
| `pnpm typecheck`                      | Passed as part of `pnpm check`.                                                                                                                                                                                     |
| `pnpm build`                          | Passed, including Electron main bundle and Vite renderer.                                                                                                                                                           |
| `pnpm test`, original environment     | 47 passed; 4 repository integration tests failed loading SQLite.                                                                                                                                                    |
| Native dependency investigation       | The checkout's `better_sqlite3.node` is a Windows x64 PE DLL; host Node is macOS arm64. This is an environment/build isolation problem, not four proven repository logic defects.                                   |
| Tests with isolated compatible SQLite | **51/51 passed across 16 files.** A temporary Node module-loader override used a separate `/tmp` installation; repository dependencies were preserved.                                                              |
| Main-process runtime probes           | Used the built main bundle, real SQLite/migrations/services, temporary databases, and a minimal fake Electron shell to call registered handlers directly. Confirmed findings below.                                 |
| Desktop exploratory check             | Launched Electron 33.4.11 with a separately rebuilt temporary SQLite module and isolated `userData`. Browser automation verified login, dashboard, Items, and the Add Item modal. Not a complete UI regression run. |
| Dependency audit                      | `pnpm audit --prod --json` reported one high-severity Drizzle advisory. Exploitability in this application was not established.                                                                                     |
| E2E inspection                        | The only Playwright test asserts that a string contains “Retail”; it never launches or interacts with the app.                                                                                                      |
| Windows/hardware                      | Clean installation, upgrade, uninstall, printer, scanner, power-loss and device-specific checks were not performed on this macOS host.                                                                              |

Audit skills applied: systematic-debugging, accessibility, web-design-guidelines, and agent-browser. The diff-only code-review skill was inspected but does not fit a whole-project audit with no comparison ref. Creation, media, connector, installation, and feature-implementation skills do not apply to this deliverable.

## Release-blocking findings

### P0-01 — Setup can be replayed after installation

**Runtime reproduced.** `apps/desktop/src/main/index.ts:1084` registers `orix:setup.store` without checking whether setup is already complete or requiring an authorized session. It updates the current user's credentials, assigns Owner, changes store details, and unlocks the app.

Probe: complete setup → logout → call setup again with new store details. Result: success, store replaced, authenticated session returned. This also creates an escalation path when a lower-privilege user is the current user. This is a local renderer/IPC authorization flaw; no remote exploit was demonstrated.

**Required:** make initial setup a one-time, transactionally enforced transition. Put legitimate owner recovery behind a separate authenticated/recovery process. Test repeated, concurrent, logged-out, and low-role setup calls.

### P0-02 — Logout/lock and roles are not enforced consistently

**Runtime reproduced.** `can()` at `apps/desktop/src/main/index.ts:2817` checks user permissions without session lock/setup status. Logout leaves `state.userId` populated. Product handlers at `:2308`, basic inventory handlers at `:2404`, and settings writes at `:1915` lack action guards. Their concrete management services do not add the missing authorization.

Probes: `users.list` and `settings.save` succeed after logout; a logged-in Viewer successfully creates a product with opening stock. Hiding navigation and buttons does not protect these operations.

**Required:** use a shared IPC guard for initialized store, active/unlocked session, active user, trusted sender, runtime payload validation, and explicit action permission. Cover every exposed channel, including reads. Recheck disabled users at unlock. Add a role × action × session-state test matrix.

### P1-03 — Refunds ignore original discounts and taxes

**Runtime reproduced for sales; corresponding purchase defect identified in source.** `packages/repositories/src/sales/sale-repository.ts:485` calculates refunds as returned quantity × original unit price, ignoring line/document discounts and taxes. Purchase returns use quantity × unit cost at `packages/repositories/src/purchases/purchase-repository.ts:468`.

Probe: item price 1,000 minor units, sale discount 200, paid 800; full return refunds **1,000**. This gives away more than was charged. Taxed sales can produce the reverse error.

**Required:** define and implement allocation of the original net line/document amounts, including rounding and cumulative partial-return limits. Resolve cash-versus-credit refunds against the original settled/unsettled amounts. Add real-database full/partial/repeated-return tests for discounted, taxed, cash, credit, and mixed sales and purchases.

### P1-04 — Drawer cash is wrong after change and refunds

**Runtime reproduced.** Sale completion caps `paid_minor` at the sale total (`packages/repositories/src/sales/sale-repository.ts:350`), while `cashRegisterSummary` subtracts `change_due_minor` again (`:667`). A 1,000 sale paid with 1,500 increases expected cash by **500**, not 1,000.

The same summary hardcodes opening cash to zero, includes customer payments without filtering their payment method, and omits supplier payments and cash refunds. A full cash refund did not reduce its expected cash. The report's separate formula (`apps/desktop/src/main/index.ts:2210`) omits mixed-sale cash, expenses, and refunds and combines a selected date range with the current business day's session. The Home dashboard implements another separate calculation.

**Required:** one authoritative cash-account movement/reconciliation calculation shared by POS, Home, and reports. Verify opening float, exact payment, change, mixed credit/cash, cash/noncash customer collections, supplier payments, expenses, and refunds against actual posted cash movements.

### P1-05 — Backup verification accepts an unusable database

**Runtime reproduced.** `verifyBackupFile` at `apps/desktop/src/main/index.ts:1585` requires only SQLite integrity and a nonempty `stores` table. A temporary database with just `CREATE TABLE stores(id TEXT)` and one row returned “valid and restorable.” It has no products, users, transactions, or migration history.

**Required:** validate application identity, supported migration version, required schema/columns, foreign keys and logical consistency. Open/migrate a staged copy before replacing live data. Reject incompatible/newer/incomplete databases. Add verified round-trip restore tests, not only filename/checksum utility tests.

### P1-06 — Restore replacement is not failure-atomic

**Source confirmed; interrupted-copy failure not simulated.** `apps/desktop/src/main/index.ts:2023` creates a safety backup, records RestoreCompleted before replacement, closes the live connection, and copies directly over the live database. It has no rollback/reopen path if copying fails after the connection closes. The failure message nevertheless says the current database was left unchanged. Concurrent operations are not put into maintenance mode.

**Required:** block new writes, stage and validate the replacement, use a Windows-tested replacement/recovery strategy, and retain a recoverable original. Handle interruption at every stage and reopen/recover on failure. Record completion only after success. Add a single-instance policy before permitting restore against shared app data.

### P1-07 — Concurrent operations can roll back each other's transaction

**Runtime reproduced.** `SqliteTransactionRunner` at `apps/desktop/src/main/index.ts:369` opens a transaction on a shared connection, awaits the callback, and unconditionally rolls back in its catch. Two overlapping handlers can reach a second BEGIN before the first COMMIT. The second operation's rollback can roll back the first operation's work.

Probe: two concurrent catalog saves produced one `APPLICATION_TRANSACTION_FAILED` and one rejected `SQLITE_ERROR`, rather than two independent, correctly isolated results.

**Required:** serialize writes across all paths using the connection, or keep each transaction entirely synchronous with correct ownership. Only roll back a transaction the operation owns. Test concurrent sale/payment/stock changes, settings/setup/import interactions, and rollback under forced failure.

### P1-08 — A committed sale can be reported as failed

**Source confirmed.** `packages/application/src/sales/sale-management.ts:227` publishes business events after commit and returns an error if event insertion fails. The renderer retains the form on error (`apps/desktop/src/renderer/index.tsx:2587`). A new sale has no persistent client operation key to recognize a retry.

Trigger: business records commit, then event persistence fails. Cashier sees failure and retries; a new sale can be posted again. Similar post-commit publishing exists in other management services.

**Required:** persist required events within the transaction or a transactional outbox. Return an unambiguous committed result and implement durable idempotency/recovery lookup. Test failure immediately before/after commit and lost IPC responses.

### P1-09 — Report totals silently omit records

**Source confirmed.** `apps/desktop/src/main/index.ts:2101` limits daily sales to 500; `:2128` limits inventory to 1,000; `:2183` and `:2204` limit receivables/payables to 500. Summary amounts at `:2263` are calculated from those truncated arrays. Low-stock filtering also happens after the inventory limit.

At 501 matching sales, the displayed/exported total excludes at least one sale. Larger catalogs can omit low-stock items entirely.

**Required:** calculate aggregates over the complete result set; paginate display rows separately and export all selected records. State whether balances/valuation are current or historical, and distinguish gross sales, returns, and net sales. Test over every current cap.

### P1-10 — POS cannot find products beyond its first 500

**Source confirmed.** `apps/desktop/src/renderer/index.tsx:2383` fetches only page 1 of 500 products/customers. Search and barcode lookup (`:2466`, `:2524`) operate only on that array. Held sales similarly load only 20 without a complete recovery browser in this module.

**Required:** database-backed exact barcode lookup and paginated/debounced product/customer search, plus access to all held sales. Test a 5,000+ product catalog and a barcode outside the first page.

### P1-11 — Business date and sale timestamps become stale

**Source confirmed.** The main process creates/selects a business day at startup and retains its ID (`apps/desktop/src/main/index.ts:623`). It uses UTC date extraction despite the configured store timezone. No wired day-close/day-open workflow updates this state.

Additionally, `emptySaleForm` is a module-level object whose timestamp is calculated once (`apps/desktop/src/renderer/index.tsx:473`). Completing/holding a sale resets to that same timestamp. Reports construct UTC boundaries (`apps/desktop/src/main/index.ts:2063`) while normal POS payloads omit the timezone suffix.

**Required:** define store-local business-date policy, create fresh form timestamps, persist normalized instants, and explicitly manage open/closed sessions and midnight rollover. Test Asia/Karachi boundaries, overnight operation, held sales from prior days, restart, and historical reports.

## Remaining functionality and hardening

| Area                                | Actual status                                             | Remaining work                                                                                                                                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Products, categories, brands, units | Implemented                                               | Close authorization gaps; verify large catalogs, duplicate cases, import reconciliation and transaction failures.                                                                                                                              |
| Inventory/opening stock/adjustments | Implemented                                               | Enforce permissions, large-data operation, diagnostics and documented approval policy.                                                                                                                                                         |
| Customers/suppliers/payments        | Implemented                                               | Cash-method reconciliation, credit-policy decisions, statements at scale, reversal/error cases.                                                                                                                                                |
| Purchases                           | Draft/receive/cancel/return implemented                   | Correct return valuation; verify paid-purchase returns and supplier balances. Partial receiving is not a base-V1 blocker unless promised to the first customer.                                                                                |
| POS/sales history                   | Implemented but unsafe to release                         | Cash math, idempotency, catalog coverage, stale timestamps, recovery and real hardware testing.                                                                                                                                                |
| Sales/purchase returns              | Implemented but financially incomplete                    | Original net-value allocation, refund settlement rules, printable return documents and agreed approval policy.                                                                                                                                 |
| Stock take                          | Session/count/complete flow present                       | Real count reconciliation/rollback/large-count testing; second-person approval only if operationally required.                                                                                                                                 |
| Expenses                            | **Not operational**                                       | Route is `ready: false` in `apps/desktop/src/renderer/routing.ts:93`. A use-case factory and repository/schema are not a wired expense workflow. Implement categories, entry, cash/ledger posting, audit, reversal and reporting.              |
| Business-day/cash sessions          | **Not operational end to end**                            | Open with float, close with counted cash, variance/reason, authorization, locked closed days and historical session report. Generic use-case factories exist but are not connected to desktop IPC/UI.                                          |
| Reports                             | Six MVP tabs exist, with CSV/system print                 | Fix totals/date/cash semantics first. Expense/profit reporting and a full stock-movement report remain incomplete relative to the production plan; do not claim historical valuation from current product cost.                                |
| Backup/restore                      | Implemented but unsafe verification/replacement           | Fix blockers and prove off-device restore. Reminders, scheduling, retention and encryption are useful follow-ups; scheduled/encrypted backup is explicitly future scope.                                                                       |
| Legacy import                       | Preview/import and backup-before-import present           | Reconcile counts, quantities and values against real customer exports; document backup recovery and skipped rows. Broader format coverage is customer-specific.                                                                                |
| Users/authentication                | Password/PIN login, roles, lock and user management exist | Central authorization; login/unlock attempt throttling; inactivity lock; prevent disabling/demoting the last owner; atomic user/credential/role changes; documented owner recovery. “Forgot Password” is disabled (`renderer/index.tsx:1279`). |
| Audit/ledger operations             | Ledger postings and some audit/event records exist        | Owner-facing audit search/export and consistency diagnostics; audit user, credential and configuration changes as well as financial actions.                                                                                                   |
| Installer                           | NSIS configuration exists                                 | Windows fresh install/upgrade/rollback/data preservation/hardware QA; release version is still `0.0.0`; establish signing and trusted distribution.                                                                                            |
| Support documentation               | Architecture/business docs extensive                      | Customer installation/setup/daily use/backup recovery/import/troubleshooting guides and a repeatable support checklist.                                                                                                                        |

Do not expand launch scope into cloud sync, multi-store, loyalty, payroll, e-commerce, advanced accounting, or AI analytics. These are excluded or future capabilities in `PROJECT_SCOPE.md`.

## Additional improvements

### Security and dependency maintenance

- Password/PIN records are salted PBKDF2 hashes with timing-safe comparison, not plaintext (`main/index.ts:756`). However, the four-digit PIN path has no attempt limiting, and login/unlock has no backend idle-session policy. Harden these after closing the direct authorization bypasses.
- BrowserWindow enables context isolation and disables Node integration. The renderer HTML has no CSP, handlers ignore sender identity, and there are no navigation/new-window restrictions in the main entry point. Add these using [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
- Electron is pinned to 33.4.11. Upgrade to a supported release line and retest native SQLite, print and packaging. Electron supports only its latest three stable majors: [support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines).
- Installed Drizzle 0.38.4 is covered by [GHSA-gpj5-g38j-94v9](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9), patched in 0.45.2. The advisory requires untrusted SQL identifier/alias construction; this audit did not establish such an exploitable call path. Upgrade and verify migrations/queries rather than treating the advisory as a proven application exploit.
- IPC TypeScript interfaces do not validate runtime messages. Validate enums, IDs, dates, finite numbers, money precision, bounds and permitted paths at the boundary. Review spreadsheet formula handling in CSV exports before exchanging untrusted customer/supplier/item names with spreadsheet software.

### UI and accessibility

Reviewed against the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), with the accessibility skill. Findings are not a claim of complete WCAG certification.

- `apps/desktop/src/renderer/index.tsx:9169` — Add Item modal lacks dialog semantics. In the live app, opening it left focus on the background Add Item button; no `[role=dialog]` or native dialog was present. Implement initial focus, focus containment/restoration and accessible naming. Escape did close the tested modal.
- `apps/desktop/src/renderer/index.tsx:9188` — symbol-only close control needs a meaningful accessible name.
- `apps/desktop/src/renderer/index.tsx:9097` — toasts lack a live/status region, so successful saves and errors may not be announced.
- `apps/desktop/src/renderer/index.tsx:9449` — shared field component marks invalid fields but does not associate error/help text using `aria-describedby`; focus the first invalid field.
- Item filter comboboxes appeared without accessible names in the live accessibility tree. Label filters explicitly.
- Verify all major screens at 1366×768 and 1920×1080, both themes, keyboard-only operation and enlarged text. The limited desktop check found no horizontal overflow on the tested Items modal at 1366×740 content size; other screens remain unverified.

### Architecture and delivery

- Main entry point: 3,293 lines; renderer entry point: 9,541 lines. Separate auth, reporting, backup and IPC modules, then page/components and shared dialog/form primitives. Keep refactoring incremental and protected by behavioral tests.
- Business logic and SQL are spread across main-process handlers and large repositories despite the documented layers. The three divergent cash formulas demonstrate the practical cost. Centralize financial rules first.
- `.github/workflows` contains a README, no executable CI workflow. Add reproducible lint/type/test/build/security gates and Windows packaging/upgrade validation.
- Separate native dependencies for host Node tests, Electron development and Windows packaging. The current Windows binary in the macOS workspace makes a normal `pnpm check` fail.
- Replace the Playwright placeholder with real Electron journeys. Existing sales/return service tests mock repository outputs, so they cannot catch incorrect SQL refund and cash calculations.
- `--smoke` loads a blank HTML page (`main/index.ts:467`), so smoke success does not prove that React, preload, navigation, checkout or printing works. Upgrade smoke coverage to an actual app readiness assertion using isolated data.
- Add structured local logs, startup/migration error handling and a support diagnostics export. Keep credentials and sensitive customer data out of logs.
- Reconcile the readiness document with implementation: reports are simultaneously described as missing and implemented; CI documentation still says the shell/lockfile do not exist.

## Ordered path to release

| Order | Work                            | Acceptance gate                                                                                                                                                                                      |
| ----- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Security boundary               | Setup replay rejected; every IPC action tested by role and session state; disabled/logged-out users cannot operate; owner recovery and last-owner protection defined.                                |
| 2     | Financial integrity             | Cash/ledger/report agreement after complete sales, change, mixed credit/cash, collections, payments, expenses and partial/full returns; no duplicate posting after retries.                          |
| 3     | Transaction and recovery safety | Concurrent writes isolated; failure injections leave no partial documents; incomplete/incompatible backups rejected; real restore and interrupted-restore recovery pass.                             |
| 4     | Daily operating completeness    | Expense entry, cash opening/closing/count variance, date rollover, complete catalog search, complete report/export totals and audit review usable by a shop owner.                                   |
| 5     | Release engineering and pilot   | All automated gates run in CI; signed/versioned distribution policy; clean Windows install and upgrade using an existing realistic database; printer/scanner/offline tests; customer/support guides. |

Start with a controlled pilot only after gates 1–4 and target-machine tests pass. Before broad rollout, reconcile the pilot's opening/closing cash, stock, receivables, payables and backup restore results against independently checked totals.

## Minimum regression scenarios

1. Fresh setup, replayed setup, every user role, disabled user, logout/lock, wrong PIN throttling and owner recovery.
2. Exact cash and overpayment/change; mixed and credit sale; sale held/resumed after restart; repeat request and lost response.
3. Full/partial discounted and taxed returns, customer-credit/cash settlement, supplier returns, and return quantities exceeding remaining entitlement.
4. Collections and supplier payments by cash and noncash method; expenses; opening float and closing variance.
5. Simultaneous mutations, forced repository/event failure, crash during commit and disk-full handling.
6. More than 500 sales/customers, more than 1,000 products, and barcode lookup beyond the first catalog page.
7. Local midnight and overnight sessions, historical report dates, and new-sale timestamps after hours of operation.
8. Backup round trip on a fresh installation, malformed/incomplete/newer backup rejection, interrupted restore, upgrade with existing records, and reinstall preserving data.

These scenarios are release acceptance criteria, not claims that the current application passes them.
