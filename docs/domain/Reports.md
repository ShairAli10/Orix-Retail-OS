# Reports Domain

## Purpose

Reports turn business records into useful operational, financial, and management insight.

## Responsibilities

Owns:

- Report definitions
- Report filters
- Report calculation meaning
- Export behavior
- Print-friendly presentation requirements

Never owns:

- Source business truth
- Ledger posting
- Inventory movement
- Sale completion
- Purchase receiving
- Payment recording

## Lifecycle

Possible states:

- Draft Definition
- Active
- Archived

Allowed transitions:

```text
Draft Definition -> Active
Active -> Archived
Archived -> Active
```

Report results are generated from source records. They are not independent business records unless
a future snapshot feature is approved.

## Business Rules

- Reports must be derived from authoritative business records.
- Report calculations must be documented.
- Financial reports must align with ledger rules.
- Inventory reports must align with inventory transaction rules.
- Reports must respect user permissions.
- Reports must be available offline.
- Exported reports should include store identity, date range, generated time, and user where
  appropriate.
- Version 1.0 reports should prioritize operational clarity over advanced analytics.

## Relationships

- Sales reports consume sales and sale item records.
- Purchase reports consume purchases and purchase item records.
- Inventory reports consume products and inventory transactions.
- Financial reports consume ledger, payments, cash accounts, and expenses.
- Customer and supplier reports consume customer, supplier, sale, purchase, payment, and ledger
  history.
- Audit reports consume audit logs.

## Events Produced

- Report Generated
- Report Exported
- Report Printed

## Events Consumed

- Sale Completed
- Purchase Received
- Payment Recorded
- Inventory Transaction Posted
- Ledger Entry Posted
- Expense Recorded
- Audit Log Recorded

## Permissions

- View: Owner, Admin, Manager; Cashier for limited operational reports
- Create: Owner, Admin, for custom report definitions in future
- Edit: Owner, Admin, for report definitions in future
- Delete: Owner, Admin, for report definitions in future
- Approve: Owner, Admin, for official exports in future
- Cancel: Not generally applicable

## Dashboard Metrics

- Today's sales
- Gross profit estimate
- Inventory value
- Outstanding receivables
- Outstanding payables
- Cash in hand
- Low stock
- Dead stock
- Today's expenses
- Top products

## Future Features

- Custom report builder
- Scheduled reports
- Saved report views
- Report snapshots
- Comparative analytics
- Tax reports
- Accountant exports
