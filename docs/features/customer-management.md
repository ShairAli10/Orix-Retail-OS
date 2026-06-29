# Customer Management

Customer Management provides the digital account book for Orix Retail OS. It replaces the physical notebook used by many small retail stores while preserving the same trust model: every amount must be explainable from dated entries.

## Architecture

The feature follows the existing desktop path:

React desktop UI -> typed Electron IPC -> application service -> repository -> SQLite.

React owns presentation only. The application layer validates requests, owns transaction boundaries, and publishes business events after commit. The repository persists customer records, ledger entries, payments, audit rows, and optimized statement queries.

## Ledger Philosophy

Customer balances are never stored directly on the customer record.

Outstanding balance is derived from immutable ledger entries where `account_ref_type = customer`:

Balance = sum(debit_minor - credit_minor)

Opening balances create ledger entries. Payments create customer payment records plus ledger entries. Future credit sales will also create ledger entries.

## Statement Generation

Statements are generated like bank statements:

- Opening balance comes from ledger history.
- Each row shows date, reference, description, debit, credit, running balance, and user.
- Running balance is calculated sequentially from ledger entries.
- Statement export and print use the same transactional data shown on screen.

## Payment Workflow

Recording a customer payment:

1. Validates active customer and positive amount.
2. Opens an application transaction.
3. Creates a customer payment row.
4. Creates a ledger transaction.
5. Debits cash and credits customer receivable.
6. Writes audit log.
7. Publishes `CustomerPaymentReceived` after commit.

## Running Balance Calculation

Running balance starts at zero for the selected statement range and applies each ledger line in date order:

Running balance += debit - credit

The closing balance is the final calculated running balance. No calculated balance is written back to the customer table.

## Permission Model

Customer actions are protected by RBAC:

- `customers.view`
- `customers.create`
- `customers.edit`
- `customers.delete`
- `customers.payments`
- `customers.export`

The sidebar hides Customers if the user lacks view permission. Row actions are disabled or hidden based on the active user permissions.

## Known Limitations

PDF export, WhatsApp messaging, duplicate merge, and sale creation are intentionally deferred. Purchase and sale history tabs remain future integration points until POS and purchase workflows are complete.
