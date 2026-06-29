# Customer Payment Workflow

## Purpose

Records money received from a customer and reduces receivable balances.

## Trigger

A customer makes a payment against outstanding credit sales or account balance.

## Preconditions

- Store is initialized.
- Business day is open.
- User can record customer payments.
- Customer exists and is not archived for new activity.
- Payment amount is greater than zero.
- Destination cash account is active.
- Customer has receivable balance unless approved advance payments are enabled.

## Happy Path

1. User selects customer.
2. System shows receivable balance.
3. User enters amount, destination cash account, date, and note.
4. System validates amount and destination.
5. User records payment.
6. Ledger-impacting records increase cash and reduce customer receivable.
7. Receipt is printed or queued if required.
8. Dashboards update.
9. Audit log records payment.

## Business Rules

- Recorded payments are immutable.
- Corrections require reversal and new payment.
- Payment amount must be greater than zero.
- Payment cannot exceed receivable balance in Version 1.0 unless customer advances are approved.
- Closed cash accounts cannot receive payment.
- Customer balance is derived from ledger-impacting records.
- Payment allocation to specific sales is future unless explicitly implemented.

## Failure Scenarios

- Customer has no receivable balance: block or require approval for advance payment.
- Cash account closed: block and choose active account.
- Printer unavailable: keep payment recorded, mark receipt unprinted.
- Amount exceeds receivable: block in Version 1.0.
- Power loss before recording: no financial effect.
- Power loss after recording: payment remains recorded; recovery must not duplicate ledger.
- Database lock: keep draft and retry.

## Business Events Produced

- CustomerPaymentReceived
- CashReceived
- CustomerReceivableReduced
- LedgerEntryPosted
- ReceiptPrinted
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log customer, amount, cash account, user, business day, timestamp, receipt status, note, and approval
if required.

## Reporting Impact

Updates receivables, customer statements, cash in hand, customer collection reports, and daily cash
summary.

## Future Enhancements

- Sale-level payment allocation
- Customer advances
- SMS or WhatsApp payment receipts
- Digital wallet collection
- Collector route tracking
