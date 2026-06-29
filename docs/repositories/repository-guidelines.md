# Repository Guidelines

## Responsibilities

Repositories are responsible for persistence mechanics only:

- Reading rows from SQLite through Drizzle
- Writing rows to SQLite through Drizzle
- Applying caller-provided filters
- Applying caller-provided optimistic concurrency checks
- Returning typed `Result<T, E>` values
- Preserving soft-delete state where the table supports it

## Anti-Patterns

Do not place these in repositories:

- Business rules
- Inventory quantity calculations
- Ledger posting logic
- Transaction ownership
- Event publishing
- Authorization checks
- UI formatting
- Report derivations
- Hidden balance adjustments

## Transactions

Repositories do not begin, commit, or roll back transactions.

Application services will own transaction scope through the core transaction abstractions. A
repository simply uses the connection it is given.

## Events

Repositories do not publish events.

Application services decide which business events are produced after a workflow succeeds.

## Soft Delete

Soft delete is supported only for tables with an `archived_at` column.

Transactional records are not hard-deleted by business workflows. The low-level hard delete helper
exists for infrastructure maintenance and tests, not normal application behavior.

## Optimistic Concurrency

Repositories support caller-provided checks:

- `expectedUpdatedAt`
- `expectedSyncVersion`

If the row no longer matches the expected value, the repository returns a conflict result.
