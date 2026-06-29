# Drizzle Mapping

This document describes how the database design should map to Drizzle ORM later. It does not contain
Drizzle code.

## Mapping Principles

- One Drizzle table definition per database table.
- Table definitions live in `packages/database`.
- Domain-neutral shared primitives may live in `packages/shared`.
- Business rules do not live in Drizzle table definitions.
- Repositories use Drizzle for persistence only.
- Application services enforce workflow rules before repository calls.

## Naming

- Database tables use snake_case.
- TypeScript symbols should use PascalCase for table-related types and camelCase for fields where
  project conventions allow.
- Keep table names stable after release.

## UUIDs

Every table uses a UUID primary key.

Implementation options:

- Generate UUIDs in application code before insert.
- Use a SQLite-compatible default only if it is deterministic and reviewed.

Application-generated UUIDs are preferred because they support future offline sync and mobile
clients.

## Money

Money maps to integer minor units.

Examples:

- `total_minor`
- `amount_minor`
- `cash_variance_minor`

Do not use floating point for money.

## Quantities

Quantities need a consistent precision policy before implementation.

Recommended options:

- Store integer scaled quantities.
- Store decimal strings validated by domain logic.

Avoid floating point quantities for stock.

## Timestamps

All timestamps are UTC.

Choose one storage convention before implementation:

- ISO 8601 UTC text.
- Integer epoch milliseconds.

Epoch milliseconds are compact and sort well. ISO text is human-readable. The decision should be
made once and enforced globally.

## JSON Fields

JSON fields are acceptable for:

- audit metadata
- business event payload summaries
- settings values

JSON fields are not acceptable for primary business facts that require joins, constraints, or
reporting.

## Enumerations

Status and type fields should map to application-level literal unions later.

Examples:

- sale status
- purchase status
- inventory movement type
- ledger transaction type
- cash account type
- backup status

The database should still constrain allowed values where practical.

## Relations

Use Drizzle relations to document navigation, but do not rely on ORM relations as the only source of
integrity.

Foreign keys remain required for core relationships.

## Migrations

Drizzle migrations should be reviewed artifacts.

Rules:

- Generated migrations require human review.
- Released migrations are immutable.
- Migration names should explain business intent.
- Migrations that affect financial or inventory data require architecture review.

## Repository Boundary

Repositories should expose persistence operations such as:

- create draft
- load by id
- list by filter
- persist posted facts
- append audit log

Repositories should not decide:

- whether a sale can complete
- whether stock is sufficient
- whether credit sale is allowed
- whether a user may approve an override
- how ledger effects are calculated

Those decisions belong to application services.

## Future Sync Mapping

Sync-ready tables should expose:

- `sync_version`
- `sync_status`
- `device_id`
- `created_at`
- `updated_at`

Immutable event and transaction tables are easier to sync than mutable aggregate tables. This is one
reason balances and stock quantities are derived rather than stored as authoritative values.
