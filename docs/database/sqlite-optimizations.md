# SQLite Optimizations

SQLite is an excellent fit for offline-first desktop retail if configured deliberately.

## WAL Mode

Use WAL mode for normal operation.

Why:

- Readers do not block writers in the common case.
- Dashboards and reports can read while transactions post.
- Better perceived performance for a desktop app.

Operational note: backup must use a WAL-safe procedure.

## Foreign Keys

Enable foreign keys for every connection.

Why:

- Prevent orphaned sale items, ledger entries, inventory transactions, and audit references.
- Preserve business integrity even when application code has a defect.

## Transactions

Use explicit transactions for every posting workflow.

Examples:

- Sale completion, inventory reduction, ledger posting, audit, and business event creation.
- Purchase receiving, inventory increase, ledger posting, audit, and event creation.
- Payment posting, ledger posting, audit, and event creation.
- Restore metadata changes and validation markers.

Power-loss recovery depends on atomic posting.

## Recommended Pragmas

The implementation should evaluate these defaults:

- `journal_mode = WAL`
- `foreign_keys = ON`
- `busy_timeout` long enough to handle normal local contention.
- `synchronous = NORMAL` for performance or `FULL` for stricter durability where testing justifies
  it.
- `temp_store = MEMORY` where safe.
- `cache_size` tuned after realistic testing.

Do not tune blindly. Validate on Windows hardware similar to customer machines.

## Vacuum Policy

Use incremental or scheduled vacuum only when needed.

Recommended:

- Avoid vacuum during trading.
- Consider vacuum after large archive/import/restore operations.
- Use `PRAGMA optimize` as part of periodic maintenance.

Full vacuum can be expensive and should not run unexpectedly in front of a cashier.

## Analyze Policy

Run `ANALYZE`:

- After major migrations.
- After large imports.
- After restore.
- Before performance testing.

Use query plan review for critical reports before Version 1.0.

## Write Contention

SQLite supports one writer at a time. This is acceptable for Version 1.0 single-store desktop use.

Mitigations:

- Keep write transactions short.
- Do not run long reports inside write transactions.
- Batch posting work inside one deliberate transaction.
- Use busy timeout and friendly retry behavior.

## Large Report Strategy

- Reports should filter by business day or date range by default.
- Long reports should stream or paginate at the application layer.
- Avoid materialized balance tables unless proven necessary.
- If projections are introduced later, they must be rebuildable from transaction tables.

## Data Types

SQLite type affinity requires discipline:

- UUIDs stored consistently as text unless binary UUID storage is benchmarked and approved.
- Money stored as integer minor units.
- UTC timestamps stored consistently as ISO text or integer epoch milliseconds; choose one before
  implementation and use it everywhere.
- Booleans stored consistently as integer flags by the ORM mapping.

## Integrity Checks

The application should support maintenance diagnostics:

- SQLite integrity check.
- Foreign key check.
- Ledger balance invariant checks.
- Inventory non-negative invariant checks where negative inventory is disabled.
- Backup verification check.
