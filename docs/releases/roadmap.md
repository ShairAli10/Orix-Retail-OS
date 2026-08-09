# Repository Roadmap Through Version 1.0

For the current implementation status, beta blockers, release blockers, and phase-by-phase
production plan, see [Production Readiness Plan](./production-readiness.md).

## Milestone 0: Foundation

- Establish monorepo structure
- Configure pnpm workspace
- Configure TypeScript project references
- Create documentation and AI context structure
- Define package boundaries
- Add baseline linting, formatting, and commit tooling

## Milestone 1: Desktop Shell

- Add Electron main process
- Add Vite React renderer
- Add preload bridge
- Add typed IPC foundation
- Add Tailwind CSS and shadcn/ui foundation
- Add first smoke test

## Milestone 2: Persistence Foundation

- Add SQLite connection lifecycle
- Add Drizzle ORM setup
- Add migration infrastructure
- Add repository testing strategy
- Add database backup and restore design

## Milestone 3: Application Service Foundation

- Define service patterns
- Define transaction patterns
- Define error and result handling
- Add IPC-to-service adapter tests
- Document business rule placement

## Milestone 4: Installer and Windows Build

- Choose Electron Builder or Electron Forge
- Configure Windows build pipeline
- Validate native dependency packaging
- Produce unsigned installer artifacts
- Document install, upgrade, and uninstall behavior

## Milestone 5: POS MVP

- Implement POS workflows
- Add receipt printing integration
- Add offline transaction persistence
- Add cash/session rules
- Add end-to-end tests for checkout flow

## Milestone 6: Inventory MVP

- Implement product catalog
- Implement stock movement model
- Implement stock adjustment workflows
- Add inventory reports required for operations
- Add migration and import/export flows

## Milestone 7: Ledger MVP

- Implement accounting transaction model
- Implement cash ledger
- Define audit trail requirements
- Integrate sales and inventory effects
- Add financial consistency tests

## Milestone 8: Reports MVP

- Implement operational reports
- Implement export formats
- Add report query performance tests
- Add print-friendly report views

## Milestone 9: Hardening and Supportability

- Add diagnostic bundle export
- Add database integrity checks
- Add backup reminders
- Add installer upgrade tests
- Add performance budget checks

## Milestone 10: Version 1.0

- Complete acceptance criteria for core retail workflows
- Sign Windows installer
- Freeze database migration policy
- Complete user-facing documentation
- Complete support and rollback playbooks
- Release `1.0.0`
