# Repository Layer

The repository layer is the persistence boundary for Orix Retail OS.

Repositories translate between application-facing data objects and the SQLite/Drizzle schema. They
do not own business workflows, transactions, events, authorization, or reporting calculations.

## Package

`@orix/repositories`

## Implemented Repository Areas

- Customers
- Suppliers
- Products
- Sales
- Purchases
- Inventory transactions
- Ledger transactions
- Customer payments
- Supplier payments
- Expenses
- Users
- Settings
- Audit logs
- Business events

## Shared Capabilities

- CRUD persistence helpers
- Find by ID
- Document-number lookup where the schema has a document number
- Pagination
- Store-aware and branch-aware filtering
- Text search
- Date-range filtering
- Soft delete and restore for tables with `archived_at`
- Optimistic concurrency through `updated_at` or `sync_version` where present
- Bulk create and bulk update
- Result-returning APIs

## Boundary Rule

A repository may answer: "What rows should be stored or loaded?"

A repository must not answer: "Is this business action allowed?"
