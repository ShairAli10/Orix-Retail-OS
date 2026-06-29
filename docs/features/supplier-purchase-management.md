# Supplier Management and Purchases

Sprint 006 adds supplier master data, supplier account books, supplier payments, and draft-to-posted purchase receiving.

## Architecture

The feature follows the existing desktop stack:

React renderer -> typed Electron IPC -> application services -> repositories -> SQLite/Drizzle schema.

The renderer never writes to SQLite directly. Repositories persist data only. Application services own validation, transactions, and post-commit event publication.

## Supplier Account Book

Supplier balances are derived from immutable ledger entries where the account reference type is `supplier`.

- Purchases credit supplier payables.
- Supplier payments debit supplier payables.
- Opening balances are posted as ledger transactions.
- Supplier statements calculate running balance at read time.

Supplier profile metadata not represented by first-class schema columns, such as city, NTN, STRN, tags, opening balance metadata, and notes, is stored in the existing supplier notes metadata envelope until a future approved schema migration promotes those fields.

## Purchase Workflow

Purchases start as drafts. Draft purchases can be edited or cancelled.

Receiving a draft purchase happens inside one transaction:

- Purchase status changes to posted/received.
- Inventory transactions are created for each purchase item.
- Ledger transaction and entries are created.
- Audit log is recorded.
- Business events are published after commit.

Received purchases are not editable in the UI. Corrections should be implemented later through returns or reversal workflows.

## Payment Workflow

Supplier payments create:

- Supplier payment record.
- Ledger transaction.
- Payable debit.
- Cash credit.
- Audit log.
- Business event.

Partial and full payments are supported. Payment allocation to specific purchases remains future work.

## UI

The supplier and purchase modules use the same professional account-book interaction model as customers:

- Searchable paginated grids.
- Profile drawers.
- Printable statements.
- CSV export for suppliers.
- Status badges and dense desktop tables.

## Known Limitations

- Supplier invoice attachments are placeholders.
- Purchase returns are not implemented yet.
- Supplier payment allocation to individual purchases is deferred.
- PDF export should be added via Electron `printToPDF`.
- Product selection in purchase creation depends on existing product records.
