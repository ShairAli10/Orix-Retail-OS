# Query Patterns

## Store and Branch Scope

Most operational queries should include `storeId`.

Branch-specific workflows such as sales, purchases, payments, expenses, inventory movements, ledger
postings, and audit lookup should include `branchId` when the table supports it.

## Pagination

Repository pagination is 1-based.

Default page size is 50. Maximum page size is 500.

## Sorting

Repositories expose table-specific sortable fields. Unknown sort fields are ignored by the shared
query helper instead of being interpolated into SQL.

## Date Ranges

Date filters are applied to the repository's primary operational date:

- Customers, suppliers, products, users: `created_at`
- Sales: `sale_date`
- Purchases: `purchase_date`
- Payments: `paid_at`
- Expenses: `expense_date`
- Inventory transactions: `posted_at`
- Ledger transactions: `posted_at`
- Audit logs: `occurred_at`
- Business events: `occurred_at`
- Settings: `effective_at`

## Text Search

Text search is intentionally simple at this stage and uses `LIKE` across approved searchable
columns. Full-text search can be introduced later without changing application service contracts.

## Document Lookup

Document-number lookup is implemented only where the schema has a document number column:

- Sales
- Purchases
- Customer payments
- Supplier payments
- Expenses

Ledger and inventory records are queried by source fields rather than synthetic document numbers.
