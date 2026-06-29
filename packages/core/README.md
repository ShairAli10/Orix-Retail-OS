# @orix/core

Reusable infrastructure contracts for Orix Retail OS.

This package contains pure TypeScript interfaces and generic utilities only. It must not depend on Electron, SQLite, Drizzle, React, or module-specific business logic.

## Responsibilities

- Result-oriented infrastructure flow contracts
- Transaction and unit-of-work abstractions
- Generic repository contracts
- Event bus contracts
- Logger, clock, ID, validation, configuration, feature flag, storage, printer, and barcode abstractions

## Non-Responsibilities

- Business services
- Repository implementations
- Database adapters
- Electron IPC handlers
- UI components
