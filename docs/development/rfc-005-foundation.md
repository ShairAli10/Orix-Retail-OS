# RFC-005 Foundation Implementation

RFC-005 transitions the repository from documentation-only architecture to a buildable foundation.

## Implemented

- pnpm workspace installs with project references.
- `@orix/shared` contains reusable primitives with no business logic.
- `@orix/domain` contains contracts, events, errors, and value-object aliases only.
- `@orix/database` contains SQLite and Drizzle bootstrap structure only.
- `@orix/electron` contains typed IPC contracts and registration shape only.
- `@orix/desktop` launches a blank Electron window after the Electron binary is installed.
- Vitest, Playwright, coverage configuration, and test utilities are configured.

## Still Out Of Scope

- Database tables
- Repositories
- Application services
- POS
- Inventory engine
- Ledger engine
- Authentication
- Screens

## Verification Commands

```sh
pnpm install
pnpm build
pnpm check
pnpm format:check
pnpm test:e2e
pnpm desktop:smoke
```

`pnpm desktop:smoke` depends on Electron's platform binary being downloaded during package install.
