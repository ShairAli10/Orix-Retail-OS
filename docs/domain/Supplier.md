# Supplier Domain

## Purpose

The Supplier domain represents vendors from whom the store purchases goods or services and to whom
the store may owe payable balances.

## Responsibilities

Owns:

- Supplier identity
- Supplier contact details
- Supplier status
- Payment terms metadata
- Supplier notes
- Supplier balance interpretation

Never owns:

- Product stock calculations
- Purchase receiving rules
- Ledger posting mechanics
- Cash account balances
- Customer receivables

## Lifecycle

Possible states:

- Draft
- Active
- On Hold
- Archived

Allowed transitions:

```text
Draft -> Active
Active -> On Hold
On Hold -> Active
Active -> Archived
On Hold -> Archived
```

Archived suppliers remain visible in historical purchases and payments.

## Business Rules

- Supplier name is required.
- Suppliers with outstanding balances cannot be deleted.
- Suppliers with historical purchases or payments must be archived instead of deleted.
- On-hold suppliers cannot be used for new purchases unless an authorized user overrides the hold.
- Supplier balances are calculated from purchases, returns, supplier payments, and ledger entries.
- Manual balance edits are not allowed.
- Payment terms are advisory in Version 1.0 unless approval workflows are later introduced.
- Supplier records must not own inventory quantities.

## Relationships

- Purchases are made from suppliers.
- Supplier payments reduce payables.
- Products may reference preferred suppliers in a future version.
- Ledger entries provide the financial truth for supplier balances.
- Reports use suppliers for purchase history, payables, and vendor performance.
- Audit logs track supplier creation, edits, holds, and archival.

## Events Produced

- Supplier Created
- Supplier Updated
- Supplier Put On Hold
- Supplier Reactivated
- Supplier Archived

## Events Consumed

- Purchase Received
- Purchase Cancelled
- Supplier Payment Recorded
- Ledger Entry Posted

## Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager
- Delete: Owner, Admin, only when no history exists
- Approve: Owner, Admin, for supplier hold overrides
- Cancel: Owner, Admin, Manager, for pending supplier changes if approval workflow exists

## Dashboard Metrics

- Outstanding payables
- Top suppliers by purchase volume
- Suppliers on hold
- New suppliers this period
- Upcoming supplier payment obligations

## Future Features

- Supplier price lists
- Lead time tracking
- Supplier scorecards
- Purchase order approvals
- Supplier statement reconciliation
