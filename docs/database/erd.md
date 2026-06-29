# Entity Relationship Diagrams

These diagrams describe business relationships. They are not SQL definitions.

## Core Store, Security, and Operations

```mermaid
erDiagram
  stores ||--o{ branches : owns
  stores ||--o{ users : has
  stores ||--o{ roles : defines
  stores ||--o{ permissions : defines
  users ||--o{ user_roles : assigned
  roles ||--o{ user_roles : grants
  roles ||--o{ role_permissions : includes
  permissions ||--o{ role_permissions : assigned
  stores ||--o{ business_days : operates
  business_days ||--o{ cash_sessions : opens
  cash_accounts ||--o{ cash_sessions : tracked_by
  users ||--o{ audit_logs : performs
```

Relationship count: 12.

## Product and Inventory

```mermaid
erDiagram
  stores ||--o{ products : owns
  categories ||--o{ products : classifies
  brands ||--o{ products : labels
  units ||--o{ products : measures
  products ||--o{ inventory_transactions : moves
  business_days ||--o{ inventory_transactions : records
  users ||--o{ inventory_transactions : posts
  inventory_counts ||--o{ inventory_count_items : contains
  products ||--o{ inventory_count_items : counted
  inventory_count_items ||--o{ inventory_transactions : produces
```

Relationship count: 10.

## Sales and Customer Payments

```mermaid
erDiagram
  stores ||--o{ customers : serves
  customers ||--o{ sales : buys
  users ||--o{ sales : creates
  business_days ||--o{ sales : contains
  sales ||--o{ sale_items : contains
  products ||--o{ sale_items : sold_as
  sales ||--o{ sale_payments : paid_by
  cash_accounts ||--o{ sale_payments : receives
  sales ||--o{ sales_returns : returned_by
  sales_returns ||--o{ sales_return_items : contains
  sale_items ||--o{ sales_return_items : reverses
  customers ||--o{ customer_payments : pays
  cash_accounts ||--o{ customer_payments : receives
```

Relationship count: 13.

## Purchases and Supplier Payments

```mermaid
erDiagram
  stores ||--o{ suppliers : buys_from
  suppliers ||--o{ purchases : supplies
  users ||--o{ purchases : creates
  business_days ||--o{ purchases : contains
  purchases ||--o{ purchase_items : contains
  products ||--o{ purchase_items : purchased_as
  purchases ||--o{ purchase_payments : paid_by
  cash_accounts ||--o{ purchase_payments : funds
  purchases ||--o{ purchase_returns : returned_by
  purchase_returns ||--o{ purchase_return_items : contains
  purchase_items ||--o{ purchase_return_items : reverses
  suppliers ||--o{ supplier_payments : paid
  cash_accounts ||--o{ supplier_payments : funds
```

Relationship count: 13.

## Financial Ledger, Expenses, Events, and Backup

```mermaid
erDiagram
  ledger_transactions ||--o{ ledger_entries : contains
  business_days ||--o{ ledger_transactions : records
  users ||--o{ ledger_transactions : posts
  cash_accounts ||--o{ ledger_entries : affects
  customers ||--o{ ledger_entries : affects
  suppliers ||--o{ ledger_entries : affects
  expenses ||--o{ ledger_transactions : produces
  expense_categories ||--o{ expenses : classifies
  cash_accounts ||--o{ expenses : funds
  stores ||--o{ settings : configures
  stores ||--o{ business_events : emits
  stores ||--o{ backups : protects
  audit_logs ||--o{ business_events : can_reference
```

Relationship count: 13.

## Future Compatibility Notes

`branches` is included even though Version 1.0 operates as a single branch. Version 1.0 should create
one default branch per store and attach operational records to that branch where appropriate.

Cloud synchronization should sync immutable business facts first: sales, purchases, payments,
inventory transactions, ledger transactions, audit logs, and business events.
