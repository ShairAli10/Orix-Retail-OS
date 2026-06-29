# Monorepo Structure

## Recommendation

Use a pnpm monorepo with one desktop application under `apps/desktop` and durable capability
packages under `packages/*`.

```text
apps/
  desktop/
packages/
  business/
  database/
  domain/
  electron/
  inventory/
  ledger/
  printer/
  shared/
  ui/
docs/
ai/
github/
.github/
```

## Why This Structure

Orix Retail OS is a desktop product, but it has multiple long-lived domains: UI, business use
cases, data persistence, printing, accounting, inventory, and shared primitives. A monorepo keeps
those domains versioned together while still allowing strict package boundaries.

The `apps/desktop` package is the composition root. It should wire Electron, React, IPC, services,
repositories, and configuration together. It should not become the place where business rules
accumulate.

The `packages/*` workspace gives each architectural concern a named home. This avoids the common
desktop-app failure mode where everything slowly becomes an Electron or React concern.

`packages/domain` contains contracts and value objects that describe the business language without
implementing workflows. `packages/electron` contains typed IPC contracts without registering
concrete handlers.

## Layer Direction

Renderer React components call typed IPC clients.

Electron IPC handlers call application services.

Application services enforce use cases and business rules.

Repositories persist and load data.

SQLite stores durable local state.

Dependencies should point inward toward stable abstractions, not outward toward UI details.
