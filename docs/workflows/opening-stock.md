# Opening Stock Workflow

## Purpose

Sets initial stock quantities when a store starts using Orix Retail OS or when a new stock-tracked
product begins with existing physical stock.

## Trigger

An authorized user records opening stock during setup or product onboarding.

## Preconditions

- Store is initialized.
- User can create opening stock.
- Product is active and stock-tracked.
- Product has no prior stock movement unless a correction policy explicitly allows adjustment.
- Opening quantity is zero or greater.
- Opening value or cost basis is provided when valuation requires it.

## Happy Path

1. User selects products for opening stock.
2. User enters quantities and optional cost basis.
3. System validates no conflicting prior movement.
4. Authorized user approves opening stock.
5. Inventory transactions are posted as opening movements.
6. Ledger-impacting opening value is recorded if valuation policy requires it.
7. Dashboards update.
8. Audit log records opening stock.

## Business Rules

- Opening stock is a first business fact, not a product edit.
- Opening quantity cannot be negative.
- Product must be stock-tracked.
- Opening stock cannot be silently repeated for the same product after movement exists.
- Corrections after movement must use stock adjustment or stock take.
- Opening stock should be completed before normal sales for affected products.

## Failure Scenarios

- Product has prior movement: block opening stock and route to adjustment.
- Negative quantity: block.
- Missing valuation data where required: hold draft.
- Approval denied: no stock effect.
- Power loss before posting: no stock effect.
- Power loss after posting: opening transaction remains; recovery must not duplicate.
- Database lock: keep draft and retry.

## Business Events Produced

- OpeningStockRecorded
- InventoryTransactionPosted
- InventoryAdjusted
- LedgerEntryPosted
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log product, quantity, cost basis where used, user, approver, business day, timestamp, and reason
that this is opening stock.

## Reporting Impact

Updates inventory value, stock on hand, opening stock report, stock movement, and audit reports.

## Future Enhancements

- Bulk import
- Barcode scanning during setup
- Opening stock template
- Multi-branch opening stock
