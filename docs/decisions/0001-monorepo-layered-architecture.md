# ADR 0001: Monorepo With Layered Architecture

## Status

Accepted

## Context

Orix Retail OS is an offline-first Windows desktop application with a long expected maintenance
life. The system must keep UI, business logic, database access, and platform integration separate.

## Decision

Use a pnpm monorepo with `apps/desktop` as the application shell and `packages/*` for architectural
boundaries.

The primary runtime flow is:

```text
React renderer -> Electron IPC -> Application services -> Repositories -> SQLite
```

## Consequences

Positive:

- Clear package ownership
- Stronger type checking
- Easier long-term refactoring
- Better test isolation

Tradeoffs:

- More initial structure
- Requires discipline around package dependencies
- Requires CI checks to prevent boundary drift
