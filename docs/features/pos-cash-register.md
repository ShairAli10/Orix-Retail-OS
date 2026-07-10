# POS, Cash Register, and Receipt Printing

## Purpose

The POS module is the front-counter selling workflow for Orix Retail OS. It is designed for fast grocery and retail checkout while preserving the architectural contracts from the approved RFCs: React renders the screen, typed IPC crosses the desktop boundary, the application layer owns transaction orchestration, repositories persist state, and SQLite remains the local offline source of truth.

## Architecture

The sale flow follows this path:

Renderer POS screen

-> typed Electron IPC

-> `SaleManagementApplicationService`

-> `SaleRepository`

-> SQLite and Drizzle schema tables

The renderer does not calculate official stock, post ledger entries, publish events, or create audit logs. It only prepares user input, displays calculated cart totals for operator feedback, and renders receipts returned by the application path.

## Sale Workflow

1. Cashier scans a barcode or searches for a product.
2. Product rows are added to the cart and quantities can be adjusted.
3. Cashier selects walk-in or registered customer.
4. Cashier chooses cash, credit, or mixed payment.
5. Sale can be held, resumed, cancelled, or completed.
6. Completion validates product status, customer eligibility, payment rules, and stock availability.
7. Completion persists the sale and sale items.
8. Completion creates immutable inventory transactions for sold stock.
9. Completion posts ledger entries for cash sales or customer credit.
10. Completion writes audit logs and emits business events after commit.
11. Receipt data is returned for preview, print, or reprint.

## Cash Register

The cash register summary is derived from posted transactions for the active business day. It includes cash sales, customer payments, recorded expenses, expected cash, sale count, and average sale. No independent cash balance is stored by the POS screen.

## Validation Rules

- Completed cash sales require cash received to cover the total.
- Credit sales require an active registered customer.
- Archived or inactive products cannot be sold.
- Stock-tracked products cannot be sold below zero stock.
- Draft and held sales can be edited; completed sales are immutable.
- Cancel is allowed only for draft or held sales.
- Sale completion publishes events only after a successful transaction commit.

## Receipt Strategy

Receipts are generated from persisted sale data, not from the in-memory cart. This keeps reprints consistent with the completed transaction. Version 1 uses the desktop print surface for receipt preview and printing. Future ESC/POS integration should implement the existing printer abstraction without changing the sale workflow.

## Keyboard Shortcuts

- `Ctrl+N`: new sale
- `Ctrl+F`: product search
- `Ctrl+B`: barcode input
- `F2`: customer selector
- `F4`: hold sale
- `F5`: resume held sale
- `F8`: complete sale
- `Ctrl+P`: print visible receipt
- `Esc`: close receipt preview

## Known Limitations

- Mixed payment is accepted by the contract, but detailed split-tender settlement is deferred.
- Profit reporting is deferred until cost-of-goods rules are finalized.
- Hardware cash drawer and ESC/POS printer integration are deferred to the hardware sprint.
- Sales returns are intentionally excluded from this sprint.
