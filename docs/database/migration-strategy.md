# Migration Strategy

Migrations must preserve customer data across years of desktop upgrades.

## Goals

- Safe upgrades on non-technical customer machines.
- Repeatable local migrations.
- Recoverable failures.
- Compatibility with native SQLite and Drizzle ORM.
- Clear support diagnostics.

## Migration Principles

- Every migration has a unique ordered identifier.
- Migrations are append-only after release.
- Released migrations are never edited.
- Migrations run inside transactions where SQLite supports the operation.
- Migrations must be idempotent at the application runner level.
- Migrations must record success, failure, start time, end time, and application version.
- Migrations that transform business data require pre-migration backup.

## Recommended Metadata Table

The implementation should include a migration metadata table when migrations are introduced.

Conceptual fields:

- id
- migration_name
- checksum
- started_at
- completed_at
- status
- app_version
- failure_reason

This table is implementation support, not a business domain table.

## Upgrade Flow

1. Verify database can be opened.
2. Enable foreign keys.
3. Check current schema version.
4. Create pre-migration backup for production upgrades.
5. Run pending migrations in order.
6. Validate critical invariants.
7. Run `ANALYZE` if migration changes data volume materially.
8. Record migration completion.
9. Start application only after migration success.

## Rollback Strategy

SQLite schema rollback should rely on:

- Transaction rollback for failed migration steps.
- Pre-migration backup restore for destructive or complex upgrades.
- Forward-fix migrations for released production mistakes.

Do not attempt casual down migrations for customer production data unless explicitly designed and
tested.

## Data Transformation Rules

- Never rewrite financial history without preserving original facts.
- Never rewrite inventory movement history without preserving original facts.
- New columns should prefer nullable or default-safe additions.
- Backfills must be deterministic and documented.
- Any migration changing money or stock interpretation requires architecture review.

## Testing Requirements

Before Version 1.0:

- Test fresh install migrations.
- Test upgrade from previous minor versions.
- Test migration interruption and recovery.
- Test backup before migration.
- Test restore after failed migration.
- Test migration performance on large realistic data sets.

## Drizzle Migration Notes

Drizzle can generate and manage schema migrations, but generated output must be reviewed.

The project should treat migration files as production artifacts. They need code review, data review,
and rollback/recovery planning.
