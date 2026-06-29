# Customer Domain

## Purpose

The Customer domain represents people or organizations that buy from the store and may carry
receivable balances.

## Responsibilities

Owns:

- Customer identity
- Contact details
- Customer status
- Credit eligibility flags
- Customer notes
- Customer balance interpretation

Never owns:

- Product pricing policy
- Sale completion rules
- Ledger posting mechanics
- Cash account balances
- Supplier obligations

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

Archived customers remain available in historical records but cannot be selected for new credit
sales.

## Business Rules

- Customer name is required.
- Contact details should be unique when available but are not the legal identity of the customer.
- Customers with outstanding balances cannot be deleted.
- Customers with historical sales or payments must be archived instead of deleted.
- On-hold customers cannot receive new credit sales.
- Cash sales may be recorded without a named customer if store settings allow walk-in sales.
- Customer balances are calculated from sales, returns, customer payments, and ledger entries.
- Manual balance edits are not allowed.
- Credit limits are optional in Version 1.0.
- Customer records must not own authentication or login behavior.

## Relationships

- Sales may be linked to customers.
- Customer payments reduce customer receivables.
- Ledger entries provide the financial truth for customer balances.
- Reports use customers for receivables, sales history, and customer activity analysis.
- Audit logs track customer creation, edits, holds, and archival.

## Events Produced

- Customer Created
- Customer Updated
- Customer Put On Hold
- Customer Reactivated
- Customer Archived

## Events Consumed

- Sale Completed
- Sale Cancelled
- Customer Payment Recorded
- Ledger Entry Posted

## Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager, Cashier
- Edit: Owner, Admin, Manager
- Delete: Owner, Admin, only when no history exists
- Approve: Owner, Admin, for credit overrides
- Cancel: Owner, Admin, Manager, for pending customer changes if approval workflow exists

## Dashboard Metrics

- Outstanding receivables
- Top customers by sales
- Customers with overdue balances
- New customers this period
- Customers on hold

## Future Features

- Loyalty points
- Customer groups
- Credit scoring
- SMS or WhatsApp reminders
- Customer statements by email
- Customer-specific pricing
