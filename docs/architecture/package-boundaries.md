# Package Boundaries

## `apps/desktop`

Electron desktop application and composition root.

Responsibilities:

- Electron main process
- Preload bridge
- React renderer
- IPC registration
- Desktop packaging configuration
- Application bootstrapping

Business rules must not live here.

## `packages/business`

Application services and business use cases.

Responsibilities:

- Coordinate workflows
- Enforce business rules
- Define service-level transactions
- Expose typed operations to IPC handlers

This package may depend on repository contracts and shared primitives. It must not depend on React.

## `packages/core`

Reusable infrastructure contracts.

Responsibilities:

- Result-oriented infrastructure flow utilities
- Transaction manager and unit-of-work contracts
- Generic repository contracts
- Event bus contracts
- Logger, clock, ID, document number, validation, configuration, feature flag, file storage,
  printer, and barcode abstractions

This package must remain pure TypeScript. It must not contain business logic, repository
implementations, SQLite, Electron, IPC, or UI.

## `packages/domain`

Domain contracts and value objects.

Responsibilities:

- Domain-facing types
- Domain event contracts
- Domain error types
- Domain value object contracts
- Cross-domain contract vocabulary

This package must not contain application services, repositories, database schema, IPC handlers, or
UI.

## `packages/database`

SQLite infrastructure boundary.

Responsibilities:

- `better-sqlite3` connection lifecycle
- Drizzle ORM configuration
- Migrations
- Repository implementations

Repositories must not contain business logic. They translate between storage and domain-facing
data contracts.

## `packages/electron`

Electron IPC contract boundary.

Responsibilities:

- Typed IPC request and response contracts
- IPC channel naming
- IPC registration structure

This package must not contain business logic, application services, or concrete IPC handlers.

## `packages/shared`

Shared technical primitives.

Responsibilities:

- Branded IDs
- Money/date helpers
- Result types
- Common validation primitives
- Cross-package constants

Shared must remain boring. If a concept has workflow meaning, it belongs in a business/domain
package instead.

## `packages/ui`

Reusable React presentation components.

Responsibilities:

- shadcn/ui wrappers
- Design-system primitives
- Layout components
- Accessibility-focused UI building blocks

This package must not call IPC, repositories, or databases directly.

## `packages/printer`

Printing boundary.

Responsibilities:

- Receipt/document rendering abstractions
- Windows printer adapter layer
- Print job preparation

Printing is isolated because it is hardware-sensitive and likely to need extensive testing.

## `packages/inventory`

Reserved future inventory module.

Responsibilities will be defined when inventory work begins. It exists now only to reserve a clean
module boundary.

## `packages/ledger`

Reserved future accounting module.

Responsibilities will be defined when ledger work begins. It exists now only to keep financial
logic isolated from UI, persistence mechanics, and unrelated workflows.
