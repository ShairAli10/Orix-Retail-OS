# Stock Take

Stock take reconciles the physical shelf quantity with the system quantity in Orix Retail OS.
It exists because shop stock is affected by damage, expiry, loss, counting mistakes, and missed
operational entries. The system must correct those differences without directly editing product
stock.

## Architecture

Stock take follows the existing layered architecture:

Renderer

Electron IPC

Application service

Inventory repository

SQLite

The renderer captures counted quantities only. The application layer validates the request,
owns the transaction boundary, and publishes business events after success. The repository persists
the count session, count items, audit logs, and adjustment transactions.

## Stock Philosophy

Product quantities are never stored as editable balances. Current stock is calculated from posted
inventory transactions.

When a stock take is started, the system snapshots each stock-tracked product's current calculated
quantity as the expected quantity. When the stock take is completed, only rows with a difference
create inventory transactions.

## Workflow

1. User starts a stock count from the Inventory screen.
2. System blocks a second draft count for the same branch.
3. System creates a draft count session and count item rows.
4. User enters physical counted quantities.
5. System validates that every counted quantity is zero or higher.
6. User posts the count.
7. System writes variance quantities to the count rows.
8. System creates inventory transactions for differences only.
9. System marks the count completed.
10. System writes audit logs and business events.

## Variance Rules

- Positive variance creates an inbound inventory transaction.
- Negative variance creates an outbound inventory transaction.
- Zero variance creates no stock movement.
- Completed counts cannot be edited.
- A branch can have only one draft stock take at a time.
- Counted quantities cannot be negative.

## Audit and Events

Stock take produces:

- `InventoryCountStarted`
- `InventoryCountCompleted`
- `InventoryAdjusted` when one or more variances are posted

The audit log records the count number, scope, item count, and variance count.

## Current Limitations

- Approval is modeled through audit metadata but does not yet require a second approving user.
- Partial stock take is supported at the contract level, but the UI starts full counts only.
- Printable count sheet currently uses browser print styling.
- Barcode-assisted count entry is still future work.
