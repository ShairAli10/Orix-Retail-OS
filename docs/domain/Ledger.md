# Ledger Domain

This document covers Ledger and Audit Logs.

## Ledger

### Purpose

The Ledger domain is the financial source of truth for money owed, money received, money paid, cash
movement, revenue, purchase costs, and expenses.

### Responsibilities

Owns:

- Financial event interpretation
- Account balance derivation
- Receivables
- Payables
- Cash movement
- Revenue and expense summaries
- Reversal financial meaning

Never owns:

- Product master data
- Customer identity
- Supplier identity
- UI report layout
- Arbitrary manual balance edits

### Lifecycle

Possible states:

- Draft
- Posted
- Reversed

Allowed transitions:

```text
Draft -> Posted
Posted -> Reversed
```

Posted ledger records are immutable. Corrections require reversing entries or approved adjustment
entries.

### Business Rules

- Financial balances must be derived from posted ledger-impacting events.
- Posted ledger records cannot be edited.
- Every posted ledger effect must have a business source.
- Reversals must preserve the original record and explain the correction.
- Customer balances are derived from sales, returns, customer payments, and adjustments.
- Supplier balances are derived from purchases, returns, supplier payments, and adjustments.
- Cash account balances are derived from sales, payments, expenses, and approved opening balances.
- Manual balance edits are not allowed.
- Ledger posting must be transactionally consistent with its source business action.
- Financial history must remain available after customers, suppliers, products, or accounts are
  archived.
- Version 1.0 should favor understandable retail accounting over advanced accounting features.

### Relationships

- Sales produce revenue, receivable, or cash effects.
- Purchases produce payable and cost effects.
- Customer payments reduce receivables and increase cash.
- Supplier payments reduce payables and decrease cash.
- Expenses decrease cash or create obligations.
- Cash accounts are summarized through ledger movement.
- Reports consume ledger balances and movements.
- Audit logs explain who caused ledger-impacting actions.

### Events Produced

- Ledger Entry Drafted
- Ledger Entry Posted
- Ledger Entry Reversed
- Customer Balance Changed
- Supplier Balance Changed
- Cash Balance Changed

### Events Consumed

- Sale Completed
- Sale Returned
- Purchase Received
- Customer Payment Recorded
- Supplier Payment Recorded
- Expense Recorded
- Cash Account Opening Balance Approved

### Permissions

- View: Owner, Admin, Manager
- Create: Application-controlled; Owner and Admin for approved adjustments
- Edit: Not allowed after posting
- Delete: Not allowed after posting
- Approve: Owner, Admin
- Cancel: Owner, Admin, while draft only

### Dashboard Metrics

- Outstanding receivables
- Outstanding payables
- Cash in hand
- Revenue today
- Expenses today
- Gross profit estimate
- Net cash movement

### Future Features

- Full chart of accounts
- Double-entry accounting reports
- Tax ledgers
- Bank reconciliation
- Accountant export
- Period closing

## Audit Logs

### Purpose

Audit Logs preserve accountability for material business actions and configuration changes.

### Responsibilities

Owns:

- Who performed an action
- When the action happened
- What business record was affected
- What type of action occurred
- Reason or note where required

Never owns:

- Business approval decisions
- Financial balance calculations
- Inventory stock calculations
- User authentication itself

### Lifecycle

Audit logs are append-only.

Possible states:

- Recorded
- Retained
- Exported

Allowed transitions:

```text
Recorded -> Retained
Recorded -> Exported
```

Audit logs must not be edited or deleted through normal application workflows.

### Business Rules

- Material actions must produce audit logs.
- Audit logs must record the acting user when available.
- Audit logs must record business date and system timestamp where applicable.
- Audit logs must preserve enough information for support and accountability.
- Audit logs must not contain sensitive secrets.
- Audit logs should survive backup and restore.
- Audit deletion is excluded from Version 1.0 except through full data retention policy in future.

### Relationships

- Users produce auditable actions.
- Sales, purchases, payments, inventory adjustments, ledger postings, settings changes, and backup
  restore operations produce audit logs.
- Reports may expose audit history to authorized users.

### Events Produced

- Audit Log Recorded
- Audit Log Exported

### Events Consumed

- Store Updated
- User Permission Changed
- Sale Completed
- Purchase Received
- Payment Recorded
- Inventory Adjusted
- Ledger Entry Posted
- Settings Updated
- Backup Restored

### Permissions

- View: Owner, Admin
- Create: System-controlled
- Edit: Not allowed
- Delete: Not allowed in Version 1.0
- Approve: Not applicable
- Cancel: Not applicable

### Dashboard Metrics

- Sensitive actions today
- Failed or reversed operations
- Recent administrative changes

### Future Features

- Audit export filters
- Tamper-evident audit chains
- Data retention policies
- Support diagnostic bundles
