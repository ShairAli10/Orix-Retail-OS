# Index Strategy

Indexes must support operational speed without turning every write into unnecessary maintenance.
SQLite is local and fast, but retail screens must stay responsive on modest Windows machines.

## General Rules

- UUID primary keys are indexed by primary key.
- Every foreign key used for joins gets an index.
- Every document number lookup gets a unique or candidate-key index.
- Reporting indexes favor date, business day, status, product, customer, supplier, and cash account.
- Avoid indexing large JSON fields.
- Add search indexes deliberately for product, customer, supplier, and document lookup.

## Table Index Plan

| Table                  | Primary Indexes | Search Indexes              | Composite Indexes                                                                              | Reporting Indexes                             | Why                                             |
| ---------------------- | --------------- | --------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| stores                 | id              | normalized name             | status + name                                                                                  | status                                        | Single-store V1, future admin lookup            |
| branches               | id              | code, name                  | store_id + code; store_id + status                                                             | store_id + is_default                         | Future multi-branch lookup                      |
| users                  | id              | username, display_name      | store_id + username; store_id + status                                                         | last_login_at                                 | Login and staff administration                  |
| roles                  | id              | name                        | store_id + name; store_id + status                                                             | is_system_role                                | Fast authorization setup                        |
| permissions            | id              | code                        | module + action                                                                                | module                                        | Permission catalog lookup                       |
| user_roles             | id              | none                        | user_id + active; role_id + active                                                             | assigned_at                                   | Permission resolution                           |
| role_permissions       | id              | none                        | role_id + active; permission_id + active                                                       | granted_at                                    | Permission resolution                           |
| business_days          | id              | business_date               | branch_id + business_date; branch_id + status                                                  | opened_at, closed_at                          | Daily operation and closing reports             |
| categories             | id              | name, code                  | store_id + parent_category_id + name; store_id + status                                        | status                                        | Product browsing and grouping                   |
| brands                 | id              | name, code                  | store_id + name; store_id + status                                                             | status                                        | Product browsing and grouping                   |
| units                  | id              | abbreviation, name          | store_id + abbreviation; store_id + status                                                     | status                                        | Product setup                                   |
| products               | id              | sku, barcode, name          | store_id + sku; store_id + barcode; store_id + status                                          | category_id, brand_id, reorder_level_quantity | POS search, barcode scanning, inventory reports |
| customers              | id              | phone, name                 | store_id + phone; store_id + status                                                            | created_at, status                            | Credit sale and receivables lookup              |
| suppliers              | id              | phone, name                 | store_id + phone; store_id + status                                                            | created_at, status                            | Purchase and payable lookup                     |
| cash_accounts          | id              | name                        | branch_id + name; branch_id + status                                                           | account_type                                  | Cash workflow selection                         |
| cash_sessions          | id              | none                        | cash_account_id + status; business_day_id + cash_account_id                                    | opened_at, closed_at                          | Day open/close and cash reconciliation          |
| sales                  | id              | sale_number                 | branch_id + sale_number; business_day_id + status; customer_id + sale_date                     | sale_date, status, completed_at               | Receipt lookup, daily reports, receivables      |
| sale_items             | id              | none                        | sale_id + product_id                                                                           | product_id + created_at                       | Product sales and margin reports                |
| sale_payments          | id              | none                        | sale_id; cash_account_id + paid_at; payment_method_id + paid_at                                | paid_at                                       | Cash and payment method summaries               |
| sales_returns          | id              | return_number               | branch_id + return_number; original_sale_id; customer_id + returned_at                         | business_day_id, returned_at                  | Return lookup and net sales reports             |
| sales_return_items     | id              | none                        | sales_return_id; sale_item_id; product_id                                                      | product_id + created_at                       | Return quantity and product return reports      |
| purchases              | id              | purchase_number             | branch_id + purchase_number; supplier_id + purchase_date; business_day_id + status             | purchase_date, received_at                    | Supplier history and purchase reports           |
| purchase_items         | id              | none                        | purchase_id + product_id                                                                       | product_id + created_at                       | Product purchase and cost history               |
| purchase_payments      | id              | none                        | purchase_id; cash_account_id + paid_at; payment_method_id + paid_at                            | paid_at                                       | Cash outflow and supplier payment summaries     |
| purchase_returns       | id              | return_number               | branch_id + return_number; original_purchase_id; supplier_id + returned_at                     | business_day_id, returned_at                  | Supplier return reports                         |
| purchase_return_items  | id              | none                        | purchase_return_id; purchase_item_id; product_id                                               | product_id + created_at                       | Returned purchase quantity reports              |
| inventory_transactions | id              | source_type + source_id     | product_id + posted_at; branch_id + posted_at; source_type + source_id                         | movement_type + posted_at; status             | Stock on hand, movement history, idempotency    |
| inventory_counts       | id              | count_number                | branch_id + count_number; branch_id + status                                                   | started_at, completed_at                      | Stock-take management                           |
| inventory_count_items  | id              | none                        | inventory_count_id + product_id; product_id                                                    | variance_quantity                             | Variance and adjustment reporting               |
| ledger_transactions    | id              | source_type + source_id     | source_type + source_id + transaction_type; business_day_id + posted_at                        | transaction_type + posted_at; status          | Idempotent posting and financial reporting      |
| ledger_entries         | id              | none                        | ledger_transaction_id; account_type + account_ref_id; account_ref_id + created_at              | account_type + created_at                     | Balance derivation and ledger reports           |
| customer_payments      | id              | payment_number              | branch_id + payment_number; customer_id + paid_at; cash_account_id + paid_at                   | business_day_id, paid_at                      | Collection reports and receivables              |
| supplier_payments      | id              | payment_number              | branch_id + payment_number; supplier_id + paid_at; cash_account_id + paid_at                   | business_day_id, paid_at                      | Payable and cash outflow reports                |
| expenses               | id              | expense_number              | branch_id + expense_number; expense_category_id + expense_date; cash_account_id + expense_date | business_day_id, expense_date                 | Expense and daily closing reports               |
| expense_categories     | id              | name, code                  | store_id + code; store_id + status                                                             | status                                        | Expense entry and reporting                     |
| payment_methods        | id              | code                        | store_id + code; store_id + status                                                             | method_type                                   | Payment selection and reporting                 |
| settings               | id              | key                         | store_id + key; category + key                                                                 | effective_at                                  | Fast configuration reads                        |
| audit_logs             | id              | target_type + target_id     | actor_user_id + occurred_at; action + occurred_at; target_type + target_id                     | business_day_id, occurred_at                  | Investigation and support                       |
| business_events        | id              | event_name                  | event_name + occurred_at; source_type + source_id; sync_status + occurred_at                   | occurred_at                                   | Event review and future sync                    |
| backups                | id              | backup_number               | store_id + backup_number; checksum                                                             | completed_at, status                          | Backup history and support                      |
| document_prints        | id              | document_type + document_id | document_type + document_id; status + attempted_at                                             | branch_id + attempted_at                      | Receipt reprint and printer diagnostics         |

## Search Strategy

Version 1.0 should support simple indexed search:

- Products by barcode, SKU, and name.
- Customers by phone and name.
- Suppliers by phone and name.
- Sales and purchases by document number.

SQLite FTS should be deferred until simple indexes prove insufficient. If FTS is introduced, it
must be limited to search projections and must not become business truth.

## Reporting Strategy

Reporting indexes should favor:

- `business_day_id`
- `posted_at`
- `sale_date`
- `purchase_date`
- `paid_at`
- `expense_date`
- `product_id`
- `customer_id`
- `supplier_id`
- `cash_account_id`

Reports must calculate from transactional tables, not from cached dashboard balance tables.

## Write Performance Guardrails

- Do not add speculative indexes.
- Revisit indexes after realistic Playwright/Vitest data-volume fixtures exist.
- Use `ANALYZE` after large imports, restores, or migrations.
- Monitor query plans for core reports before Version 1.0 freeze.
