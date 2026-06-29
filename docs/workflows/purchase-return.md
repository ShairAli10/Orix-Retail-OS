# Purchase Return Workflow

## Purpose

Records goods returned to a supplier and reverses the related stock and payable effects.

## Trigger

A user returns purchased goods because of damage, wrong items, excess quantity, supplier agreement,
or pricing dispute.

## Preconditions

- Store is initialized.
- Business day is open.
- User can create purchase returns.
- Supplier is active or historically available.
- Original purchase exists where required by policy.
- Returned products are identifiable.
- Available stock exists for stock-tracked returned quantity unless an approved exception is used.

## Happy Path

1. User selects original purchase or supplier.
2. User selects returned items, quantities, and reason.
3. System validates quantities against available stock and original purchase where applicable.
4. Authorized user approves the return.
5. Inventory transactions reduce stock for stock-tracked returned items.
6. Ledger-impacting records reduce supplier payable or create supplier credit.
7. Dashboard metrics update.
8. Audit log records return reason and approval.

## Business Rules

- Purchase returns should reference the original purchase when possible.
- Return quantity cannot exceed purchased or available quantity unless approved.
- Stock-tracked returned items reduce inventory.
- Returned value cannot create hidden supplier balance edits.
- Posted returns are immutable and corrected by reversal.
- Supplier credit handling is basic in Version 1.0 and must be clearly reported.

## Failure Scenarios

- Original purchase missing: require authorized non-referenced supplier return or block.
- Insufficient stock: block or require approved stock discrepancy workflow.
- Supplier already archived: allow historical return only with Owner/Admin approval.
- Payable already settled: create supplier credit or require refund workflow decision.
- Power loss before posting: no stock or ledger effect.
- Power loss after posting: return remains posted; recovery must not duplicate reversal.
- Database lock: keep draft and retry.

## Business Events Produced

- PurchaseReturned
- InventoryReduced
- SupplierPayableReduced
- LedgerEntryPosted
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log supplier, original purchase if available, items, quantities, reason, user, approver, value,
business day, and financial effect.

## Reporting Impact

Updates purchase returns, stock movement, supplier balances, inventory value, and gross purchase
cost reporting.

## Future Enhancements

- Supplier debit notes
- Supplier refunds
- Quality inspection workflow
- Batch and expiry-aware returns
