# Supplier Payment Workflow

## Purpose

Records money paid to a supplier and reduces supplier payable balances.

## Trigger

An authorized user pays a supplier against outstanding purchases or general supplier balance.

## Preconditions

- Store is initialized.
- Business day is open.
- User can record supplier payments.
- Supplier exists.
- Payment amount is greater than zero.
- Payment source cash account is active.
- Supplier has payable balance unless approved advance payments are enabled.

## Happy Path

1. User selects supplier.
2. System shows payable balance.
3. User enters amount, payment source, date, and note.
4. System validates amount and cash account.
5. Authorized user records payment.
6. Ledger-impacting records reduce cash and supplier payable.
7. Dashboard metrics update.
8. Audit log records payment.

## Business Rules

- Recorded payments are immutable.
- Corrections require reversal and a new payment.
- Payment amount must be greater than zero.
- Payment cannot exceed payable balance in Version 1.0 unless advance payments are approved.
- Closed cash accounts cannot be used.
- Supplier balance is derived from ledger-impacting records.
- Payment allocation to specific purchases is future unless explicitly implemented.

## Failure Scenarios

- Supplier has no payable balance: block or require Owner/Admin approval for advance payment.
- Cash account closed: block and ask user to choose active source.
- Amount exceeds payable: block in Version 1.0.
- Power loss before recording: no financial effect.
- Power loss after recording: payment remains recorded; recovery must not duplicate ledger effects.
- Database lock: do not post; keep draft and retry.

## Business Events Produced

- SupplierPaymentRecorded
- CashPaid
- SupplierPayableReduced
- LedgerEntryPosted
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log supplier, amount, cash account, user, business day, timestamp, note, approval if required, and
reversal reference if corrected later.

## Reporting Impact

Updates supplier balance, outstanding payables, cash in hand, supplier payment history, and cash flow
reports.

## Future Enhancements

- Purchase-level allocation
- Supplier advances
- Bank transfer export
- Cheque tracking
- Supplier statement reconciliation
