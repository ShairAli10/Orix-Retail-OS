# POS Production Hardening

The POS is the highest-frequency workflow in Orix Retail OS. This phase improves checkout safety,
cashier feedback, held-sale recovery, and receipt print reliability without changing the approved
layered architecture.

## Payment Guardrails

- Cash sales require cash received to cover the full sale total.
- Credit sales require a selected customer.
- Cash + Credit sales require a selected customer and a partial cash amount.
- Cash + Credit cannot be used when the cash amount is zero or covers the full sale.
- The POS warns the cashier before submission when stock is lower than cart quantity.

## Failure Recovery

The POS now keeps the current cart intact when completion fails. Friendly messages guide the cashier
to fix the issue instead of losing the checkout.

Common examples:

- short cash received
- missing customer for credit or mixed payment
- empty cart
- insufficient stock

## Held Sales

Held sale recovery now shows:

- sale number
- customer
- item count
- sale time
- total amount

Cashiers can resume or delete held carts from the held-sales dialog. Actions are disabled while a
sale operation is already running to prevent duplicate clicks.

## Receipt Printing

Receipts remain available after sale completion. Printing currently uses the operating system print
dialog through the Electron renderer print path. The receipt modal gives visible feedback once the
print action has been sent.

Hardware receipt printer and cash drawer integration remain future work.

## Ledger Behavior

Mixed payment ledger posting now splits the sale into:

- cash portion
- customer receivable portion
- sales revenue

This keeps customer balances transaction-derived and avoids treating mixed payments as full cash.

## Remaining Hardening

- Dedicated ESC/POS receipt printer adapter.
- Cash drawer open/close hardware status.
- Power-loss checkout recovery test.
- Duplicate barcode scanner input timing QA.
- Electron end-to-end tests around checkout.
