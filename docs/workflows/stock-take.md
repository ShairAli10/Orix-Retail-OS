# Stock Take Workflow

## Purpose

Compares counted physical stock with system-derived stock and posts approved adjustments for
differences.

## Trigger

A manager starts a physical inventory count for selected products, categories, or the whole store.

## Preconditions

- Store is initialized.
- Business day is open or stock-take mode is explicitly allowed.
- User can start stock takes.
- Products selected are stock-tracked.
- Counting scope is defined.
- Open sale or purchase activity is controlled by policy.

## Happy Path

1. User starts stock take and defines scope.
2. System captures expected derived quantities at count start.
3. Staff count physical stock.
4. Counted quantities are entered or scanned.
5. System calculates variances.
6. Authorized user reviews and approves variances.
7. Approved variances create inventory adjustment transactions.
8. Dashboard metrics update.
9. Audit log records count completion and adjustments.

## Business Rules

- Stock take must preserve expected quantity snapshot for review.
- Counted quantity cannot be negative.
- Variances require approval before posting.
- Completion creates inventory transactions for differences only.
- Posted stock take adjustments are immutable.
- Products outside scope must not be adjusted.
- Stock take should warn if sales or purchases occur during counting.

## Failure Scenarios

- Count interrupted: keep count in progress; no adjustments until approved.
- Product scanned outside scope: warn and require explicit add-to-scope permission.
- Variance approval denied: no stock effect; count may be revised or cancelled.
- Power loss before completion: recover in-progress count if possible.
- Power loss after completion: posted adjustments remain; recovery must not duplicate.
- Database lock: pause posting and allow retry.

## Business Events Produced

- InventoryCountStarted
- InventoryCountCompleted
- InventoryAdjusted
- InventoryTransactionPosted
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log scope, products counted, expected quantities, counted quantities, variances, user, approver,
business day, timestamps, and adjustment references.

## Reporting Impact

Updates stock take report, variance report, inventory value, adjustment report, low stock, out of
stock, and audit reports.

## Future Enhancements

- Barcode scanner count mode
- Mobile stock take
- Blind counts
- Cycle counting
- Multi-location stock take
