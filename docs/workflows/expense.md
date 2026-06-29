# Expense Workflow

## Purpose

Records non-inventory business costs such as rent, wages, utilities, transport, tea, repairs, or
petty cash spending.

## Trigger

A user records a business expense paid from cash or another configured account.

## Preconditions

- Store is initialized.
- Business day is open.
- User can create expenses.
- Expense category or reason is available.
- Amount is greater than zero.
- Payment source is active.

## Happy Path

1. User enters expense date, category, description, amount, and payment source.
2. System validates amount, category, source account, and permission.
3. Expense is approved if required.
4. Expense is recorded as immutable financial history.
5. Ledger-impacting records reduce cash or record payable treatment.
6. Dashboards update.
7. Audit log records expense.

## Business Rules

- Recorded expenses are immutable.
- Expense amount must be greater than zero.
- Expense reason or category is required.
- Closed cash accounts cannot fund expenses.
- Expense reversals require Owner/Admin approval.
- Expenses must not be used to purchase stock-tracked products.
- Expense reports derive from recorded expense events and ledger effects.

## Failure Scenarios

- Missing category: block and request category.
- Insufficient cash warning: block or require approval depending on cash policy.
- Closed account: block and select active account.
- Approval required: hold as draft until approved.
- Power loss before recording: no ledger effect.
- Power loss after recording: expense remains recorded; recovery must not duplicate.
- Database lock: keep draft and retry.

## Business Events Produced

- ExpenseRecorded
- CashPaid
- LedgerEntryPosted
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log expense category, description, amount, payment source, user, approver if required, business day,
timestamp, and reversal reason where applicable.

## Reporting Impact

Updates expense totals, cash outflow, net profit estimate, expense by category, and daily closing
reports.

## Future Enhancements

- Recurring expenses
- Attachments
- Supplier-linked bills
- Approval thresholds
- Tax-deductible classifications
