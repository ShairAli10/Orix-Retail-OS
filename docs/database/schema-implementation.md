# Schema Implementation

RFC-006 implements the approved database architecture as Drizzle ORM schema definitions.

This implementation contains schema, relations, shared database utilities, and migration structure
only. It does not contain repositories, services, IPC, UI, POS, inventory engine, or ledger engine.

## Folder Organization

```text
packages/database/src/
  connection/
  migrations/
    0000_initial_schema.sql
    run-migrations.ts
  schema/
    shared.ts
    stores.ts
    branches.ts
    ...
    relations.ts
    index.ts
```

## Naming Conventions

- Database tables use snake_case.
- Drizzle table exports use camelCase.
- Columns use camelCase in TypeScript and snake_case in SQLite.
- UUID primary keys are named `id`.
- Money fields use integer minor units and end with `Minor`.
- Quantity fields use scaled integer storage.
- Timestamps are stored as UTC text.

## Shared Types

`schema/shared.ts` provides reusable column helpers for:

- UUID primary keys
- UUID foreign keys
- Money integer fields
- Quantity scaled integer fields
- Timestamp fields
- Soft delete timestamps
- Audit timestamps
- Sync/version metadata
- Common check expressions

## Relation Strategy

Each table lives in its own module. Foreign-key references are declared in table modules where
one-way imports are straightforward.

All Drizzle `relations(...)` definitions live in `relations.ts`. This keeps table modules focused
and avoids circular relation imports.

## Migration Strategy

The initial migration is `0000_initial_schema.sql`.

Migration execution is exposed through `runMigrations(connection, { migrationsFolder })`, using
Drizzle's SQLite migrator. Released migrations are immutable and must be followed by new forward
migrations.

## Intentional Scope

Implemented in RFC-006:

- Lookup tables
- Master data tables
- Sales and purchase tables
- Payment and expense tables
- Inventory transaction table
- Ledger account, transaction, and entry tables
- Cash account and session tables
- Settings, audit logs, business events, backups

Not implemented in RFC-006:

- Repositories
- Services
- Seeds
- UI
- IPC handlers
- Return tables from RFC-004
- Stock-take tables from RFC-004
- Print tracking tables from RFC-004

Those omitted tables remain in the architecture roadmap and should be implemented by the RFC that
introduces their workflows.

## Deviations

RFC-006 explicitly requested `ledger_accounts`, so the implementation includes account catalog
support in addition to `ledger_transactions` and `ledger_entries`.

No calculated stock or balance columns are stored.
