# Orix Retail OS Constitution

## Product Identity

Orix Retail OS is an offline-first Windows desktop Retail Management System by Orix Tech.

Development happens on macOS. Production targets Windows.

The customer must be able to install and use the software with no technical knowledge.

## Non-Negotiable Principles

1. The application must work without an internet connection.
2. Business logic must never live in React components.
3. Repositories must never contain business logic.
4. Electron IPC boundaries must be typed.
5. TypeScript must remain strict.
6. Do not use `any`.
7. Database migrations must be designed for customer upgrades.
8. Architecture must favor maintainability over short-term speed.
9. Product modules must remain isolated by package boundaries.
10. Do not implement unapproved product domains early.

## Current Scope

The current repository scope is foundation only.

Do not implement:

- POS
- Inventory workflows
- Ledger workflows
- Reports
- Authentication
- Database schema
