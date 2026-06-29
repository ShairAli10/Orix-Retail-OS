# Database Architecture

This directory defines the planned SQLite database architecture for Orix Retail OS.

It is documentation only. It does not define Drizzle code, SQL migrations, repositories, services,
IPC contracts, Electron behavior, or React behavior.

## Objectives

The database must support:

- Offline-first retail operation
- ACID transactions
- High read performance on local hardware
- Financial integrity
- Inventory integrity
- Full auditability
- Reliable backup and restore
- Future cloud synchronization
- Future multi-branch expansion

## Core Design

Orix Retail OS uses SQLite as the local system of record. The database stores business facts, not
screen state.

Financial balances are derived from ledger records.

Inventory quantities are derived from inventory transactions.

Reports are derived from transactional records.

Audit logs are append-only business accountability records.

## Documents

- [ERD](./erd.md)
- [Table Catalog](./table-catalog.md)
- [Index Strategy](./index-strategy.md)
- [Constraints](./constraints.md)
- [Migration Strategy](./migration-strategy.md)
- [Backup Strategy](./backup-strategy.md)
- [SQLite Optimizations](./sqlite-optimizations.md)
- [Drizzle Mapping](./drizzle-mapping.md)

## Table Count

The proposed Version 1.0 schema contains 41 logical tables.

## Relationship Count

The proposed ERD documents 61 primary relationships.

## Non-Negotiable Database Principles

- Every table has a UUID primary key.
- Integer internal IDs are not used unless a future benchmark proves a specific performance need.
- Store timestamps in UTC.
- Do not store derived customer, supplier, cash, ledger, or stock balances as business truth.
- Never hard delete transactional records.
- Financial and inventory posting records are immutable after posting.
- Use soft deletion only for master/configuration records where archival is a valid business state.
- Every critical business action must be attributable to a user or system actor.
- Every posted transaction must be recoverable after power loss without duplicate effects.

## Future Compatibility

### Multi-Store

Version 1.0 is single-store, but store ownership is explicit through `store_id` on store-owned
records. This allows future installations to host multiple store identities without rewriting the
entire schema.

The application should still enforce one active primary store in Version 1.0.

### Multi-Branch

`branches` exists from the beginning. Version 1.0 should create one default branch per store.

Operational records should include `branch_id` where branch ownership will matter later:

- business days
- sales
- purchases
- payments
- expenses
- inventory transactions
- cash accounts
- cash sessions
- ledger transactions
- audit logs

This avoids a painful migration when branch support is introduced.

### Cloud Sync

Future sync should prefer immutable facts:

- business_events
- audit_logs
- sales and sale_items
- purchases and purchase_items
- payments
- expenses
- inventory_transactions
- ledger_transactions and ledger_entries

Mutable master data should use version metadata and conflict rules. Derived balances should not be
synced because they can be recalculated.

### Mobile App

Future mobile clients can create offline UUIDs and later sync immutable facts. Application-generated
UUIDs make this possible without central ID allocation.

Mobile writes should target service-defined workflows, not direct table mutation.

### API Layer

A future API layer can expose workflow commands and read models over this schema. It should not
expose table CRUD for posted financial or inventory records.

The API should preserve these invariants:

- posted facts are immutable
- stock derives from inventory transactions
- balances derive from ledger entries
- critical actions produce audit logs
- sync conflicts never silently overwrite financial or inventory history
