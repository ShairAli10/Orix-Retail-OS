# RFC-007 Core Infrastructure Layer

RFC-007 adds `@orix/core`, the reusable infrastructure contract package for Orix Retail OS.

## Implemented

- Result-oriented infrastructure helpers built on the approved shared `Result<T, E>` shape.
- Transaction manager, transaction context, transaction scope, and unit-of-work interfaces.
- Generic repository contracts with read, write, paged, and specification support.
- Event bus contracts for publishing, subscribing, dispatching, and replaying events.
- Domain event and integration event envelope types.
- Logger, audit logger, clock, ID generator, sequential number generator, and document number
  generator contracts.
- Validation, configuration, feature flag, file storage, receipt printer, barcode generator, and
  barcode scanner contracts.

## Boundary Rules

`@orix/core` is intentionally implementation-free.

It must not contain:

- Business services
- Repository implementations
- SQLite, Drizzle, or database adapters
- Electron, IPC, or renderer code
- POS, inventory, ledger, reporting, or authentication workflows

Concrete adapters belong in infrastructure-facing packages such as `@orix/database`,
`@orix/printer`, or future platform packages. Application services should depend on these
contracts rather than concrete infrastructure.

## Verification Commands

```sh
pnpm typecheck
pnpm build
pnpm lint
pnpm test
pnpm format:check
```
