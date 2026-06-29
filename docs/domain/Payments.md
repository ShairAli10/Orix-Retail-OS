# Payments Domain

This document covers Customer Payments, Supplier Payments, Cash Accounts, and Expenses.

## Customer Payments

### Purpose

Customer Payments record money received from customers to settle receivable balances.

### Responsibilities

Owns:

- Payment amount
- Payment date
- Paying customer
- Cash or payment destination
- Allocation meaning where supported
- Payment status

Never owns:

- Customer identity
- Sale totals
- Cash account master data
- Ledger account definitions
- Manual customer balance edits

### Lifecycle

Possible states:

- Draft
- Recorded
- Reversed
- Cancelled

Allowed transitions:

```text
Draft -> Recorded
Draft -> Cancelled
Recorded -> Reversed
```

### Business Rules

- Customer payment amount must be greater than zero.
- Customer is required.
- Payment destination is required.
- Recorded payments increase cash or bank balance through ledger-impacting records.
- Recorded payments reduce customer receivable balance through ledger-impacting records.
- Recorded payments cannot be edited directly.
- Corrections require reversal and a new payment.
- Customer overpayments are excluded from Version 1.0 unless explicitly approved.

### Relationships

- Customer payments belong to customers.
- Customer payments may be allocated to sales in future versions.
- Cash accounts receive payment value.
- Ledger provides the financial truth for receivable and cash balances.
- Reports use payments for cash collection, receivables, and customer statements.

### Events Produced

- Customer Payment Drafted
- Customer Payment Recorded
- Customer Payment Reversed
- Customer Payment Cancelled

### Events Consumed

- Sale Completed
- Customer Archived
- Cash Account Closed

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager, Cashier
- Edit: Owner, Admin, Manager, Cashier, while draft
- Delete: Owner, Admin, only while draft
- Approve: Owner, Admin, for reversals
- Cancel: Owner, Admin, Manager, while draft

### Dashboard Metrics

- Cash collected today
- Outstanding receivables
- Customer payment total this period
- Payment reversals

### Future Features

- Payment allocation by invoice
- Overpayment credit
- Split tender payments
- Card terminal integration
- Digital wallet support

## Supplier Payments

### Purpose

Supplier Payments record money paid to suppliers to settle payable balances.

### Responsibilities

Owns:

- Payment amount
- Payment date
- Supplier paid
- Cash or payment source
- Allocation meaning where supported
- Payment status

Never owns:

- Supplier identity
- Purchase totals
- Cash account master data
- Ledger account definitions
- Manual supplier balance edits

### Lifecycle

Possible states:

- Draft
- Recorded
- Reversed
- Cancelled

Allowed transitions:

```text
Draft -> Recorded
Draft -> Cancelled
Recorded -> Reversed
```

### Business Rules

- Supplier payment amount must be greater than zero.
- Supplier is required.
- Payment source is required.
- Recorded payments reduce cash or bank balance through ledger-impacting records.
- Recorded payments reduce supplier payable balance through ledger-impacting records.
- Recorded payments cannot be edited directly.
- Corrections require reversal and a new payment.
- Supplier overpayments are excluded from Version 1.0 unless explicitly approved.

### Relationships

- Supplier payments belong to suppliers.
- Supplier payments may be allocated to purchases in future versions.
- Cash accounts provide payment value.
- Ledger provides the financial truth for payable and cash balances.
- Reports use payments for cash outflow, payables, and supplier statements.

### Events Produced

- Supplier Payment Drafted
- Supplier Payment Recorded
- Supplier Payment Reversed
- Supplier Payment Cancelled

### Events Consumed

- Purchase Received
- Supplier Archived
- Cash Account Closed

### Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager, while draft
- Delete: Owner, Admin, only while draft
- Approve: Owner, Admin, for payment recording and reversals
- Cancel: Owner, Admin, Manager, while draft

### Dashboard Metrics

- Supplier payments today
- Outstanding payables
- Cash paid to suppliers this period
- Payment reversals

### Future Features

- Payment allocation by purchase
- Scheduled supplier payments
- Bank transfer file export
- Supplier credit notes

## Cash Accounts

### Purpose

Cash Accounts represent places where money is held or tracked, such as cash drawer, petty cash, or
bank account.

### Responsibilities

Owns:

- Cash account identity
- Account type
- Active status
- Opening context
- Cash balance interpretation

Never owns:

- Sale lifecycle
- Purchase lifecycle
- Expense approval
- Manual financial truth independent of ledger entries

### Lifecycle

Possible states:

- Draft
- Active
- Closed
- Archived

Allowed transitions:

```text
Draft -> Active
Active -> Closed
Closed -> Active
Closed -> Archived
```

### Business Rules

- Cash account name is required.
- At least one active cash account is required before cash sales or payments.
- Cash account balances are calculated from ledger entries.
- Cash accounts with financial history cannot be deleted.
- Closed cash accounts cannot receive new transactions.
- Opening balances must be recorded as approved financial entries, not arbitrary edits.
- Cash account changes must be audit logged.

### Relationships

- Sales may deposit cash into cash accounts.
- Customer payments deposit into cash accounts.
- Supplier payments withdraw from cash accounts.
- Expenses withdraw from cash accounts.
- Ledger tracks cash account balance movements.
- Reports use cash accounts for cash in hand, cash flow, and reconciliation.

### Events Produced

- Cash Account Created
- Cash Account Activated
- Cash Account Closed
- Cash Account Reopened
- Cash Account Archived

### Events Consumed

- Sale Completed
- Customer Payment Recorded
- Supplier Payment Recorded
- Expense Recorded
- Ledger Entry Posted

### Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin
- Edit: Owner, Admin
- Delete: Owner, Admin, only when no history exists
- Approve: Owner, Admin, for opening balances and closures
- Cancel: Owner, Admin

### Dashboard Metrics

- Cash in hand
- Cash by account
- Cash inflow today
- Cash outflow today
- Net cash movement

### Future Features

- Cash drawer sessions
- Cash reconciliation
- Bank deposits
- Bank feeds
- Multi-currency cash accounts

## Expenses

### Purpose

Expenses record non-inventory business costs paid or owed by the store.

### Responsibilities

Owns:

- Expense description
- Expense category meaning
- Expense amount
- Expense date
- Payment source
- Expense status

Never owns:

- Supplier payable lifecycle unless supplier expense workflows are later approved
- Product purchase stock movement
- Customer receivables
- Cash account balance truth independent of ledger

### Lifecycle

Possible states:

- Draft
- Approved
- Recorded
- Reversed
- Cancelled

Allowed transitions:

```text
Draft -> Approved
Approved -> Recorded
Draft -> Cancelled
Approved -> Cancelled
Recorded -> Reversed
```

### Business Rules

- Expense amount must be greater than zero.
- Expense date is required.
- Expense reason or category is required.
- Recorded expenses reduce cash or increase payable depending on payment mode.
- Recorded expenses must affect ledger reporting.
- Recorded expenses cannot be edited directly.
- Corrections require reversal and a new expense.
- Expense categories are settings-controlled in Version 1.0.

### Relationships

- Expenses may be paid from cash accounts.
- Expenses affect ledger and cash reports.
- Audit logs track approval, recording, and reversal.
- Reports use expenses for profit, cash flow, and cost analysis.

### Events Produced

- Expense Drafted
- Expense Approved
- Expense Recorded
- Expense Reversed
- Expense Cancelled

### Events Consumed

- Cash Account Closed
- Settings Updated

### Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager, while draft
- Delete: Owner, Admin, only while draft
- Approve: Owner, Admin
- Cancel: Owner, Admin, Manager, while not recorded

### Dashboard Metrics

- Expenses today
- Expenses this period
- Expense by category
- Net profit estimate
- Cash outflow

### Future Features

- Recurring expenses
- Expense attachments
- Expense approval thresholds
- Supplier-linked bills
- Tax-deductible expense classification
