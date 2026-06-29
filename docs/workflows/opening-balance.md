# Opening Balance Workflow

## Purpose

Records initial customer, supplier, or cash balances when a store begins using Orix Retail OS.

## Trigger

An authorized user enters balances from previous records during setup or migration.

## Preconditions

- Store is initialized.
- User can create opening balances.
- Customer, supplier, or cash account exists and is active.
- No conflicting prior financial movement exists for the same balance context unless approved.
- Amount and direction are clearly specified.

## Happy Path

1. User selects balance type: customer receivable, supplier payable, or cash account.
2. User selects party or account.
3. User enters amount, direction, date, and source note.
4. System validates no conflicting prior balance history.
5. Authorized user approves opening balance.
6. Ledger-impacting opening entry is posted.
7. Dashboard metrics update.
8. Audit log records opening balance.

## Business Rules

- Opening balances are ledger-impacting records.
- Manual balance edits are not allowed.
- Amount must be greater than zero unless explicitly recording a zero confirmation.
- Opening balances should be entered before normal transactions for the party or account.
- Corrections after activity must use reversal or approved adjustment.
- Source note is required for accountability.

## Failure Scenarios

- Party or account already has activity: block or require Owner/Admin migration approval.
- Amount direction unclear: block.
- Approval denied: no ledger effect.
- Power loss before posting: no financial effect.
- Power loss after posting: opening balance remains; recovery must not duplicate.
- Database lock: keep draft and retry.

## Business Events Produced

- OpeningBalanceRecorded
- LedgerEntryPosted
- CustomerReceivableIncreased
- SupplierPayableIncreased
- CashBalanceChanged
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log balance type, party or account, amount, direction, source note, user, approver, business day, and
timestamp.

## Reporting Impact

Updates receivables, payables, cash in hand, opening balance report, ledger summary, and audit
reports.

## Future Enhancements

- Migration import wizard
- Trial balance import
- Document attachments
- Accountant review workflow
