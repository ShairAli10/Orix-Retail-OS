# Constraints

Constraints protect the database from states that business services must never create.

This document describes intended constraints without writing SQL.

## Global Constraints

- Every table uses a UUID primary key.
- Foreign keys must be enabled.
- Timestamps are stored in UTC.
- Monetary values are stored as integer minor units.
- Quantities use deterministic decimal storage policy approved before implementation.
- Status fields use documented enumerations.
- Posted financial and inventory records are immutable.
- Transactional records are not hard deleted.

## Referential Integrity

- Child records cannot reference missing parent records.
- Master records with transactional history are archived, not deleted.
- Products referenced by sale, purchase, return, or inventory records cannot be hard deleted.
- Customers and suppliers with history cannot be hard deleted.
- Users with audit or transaction history cannot be hard deleted.
- Cash accounts with ledger history cannot be hard deleted.

## Financial Integrity

- Ledger entries derive balances; balance columns must not be stored on customers, suppliers, or
  cash accounts as business truth.
- Ledger transaction posting must be atomic with its source workflow.
- Ledger transaction source idempotency must prevent duplicate posting after power loss.
- Ledger entries should balance by transaction where double-entry policy is active.
- Posted ledger transactions cannot be edited.
- Reversals reference original ledger transactions.
- Payment amounts must be greater than zero.
- Expense amounts must be greater than zero.
- Sale and purchase totals cannot be negative.

## Inventory Integrity

- Inventory quantities derive from inventory_transactions.
- Inventory transaction posting must be atomic with its source workflow.
- Inventory transaction source idempotency must prevent duplicate stock movement.
- Posted inventory transactions cannot be edited.
- Reversals reference original inventory transactions.
- Inventory transaction quantity must be greater than zero.
- Stock-tracked product movement must reference a product.
- Negative inventory is disabled by default and must be enforced before posting reducing movements.

## Document Integrity

- Completed sales are immutable.
- Received purchases are immutable.
- Posted payments are immutable.
- Posted expenses are immutable.
- Posted returns are immutable.
- Draft documents may be edited or cancelled according to workflow rules.
- Completed or posted documents are corrected through return, reversal, or adjustment workflows.

## Candidate Key Constraints

- Product SKU unique per store when present.
- Product barcode unique per store when present.
- Sale number unique per branch.
- Purchase number unique per branch.
- Customer payment number unique per branch.
- Supplier payment number unique per branch.
- Expense number unique per branch.
- Backup number unique per store.
- Role name unique per store.
- Permission code globally unique.
- Setting key unique per store and effective version.

## Audit Constraints

- Critical actions require actor user or system actor.
- Audit logs are append-only.
- Audit logs include target type and target id when the action affects a business record.
- Audit metadata must not store secrets.
- Restore and backup actions require audit logs.

## Soft Delete and Archive Constraints

Soft delete is appropriate for:

- users
- roles
- categories
- brands
- units
- products
- customers
- suppliers
- cash_accounts
- expense_categories
- payment_methods

Soft delete is not appropriate for:

- posted sales
- posted purchases
- posted returns
- posted payments
- posted expenses
- inventory_transactions
- ledger_transactions
- ledger_entries
- audit_logs
- business_events

## Application-Level Constraints

Some constraints require service-level validation before persistence:

- At least one active Owner/Admin user.
- One active default branch per store.
- One open business day per branch.
- One open cash session per cash account.
- Sale completion stock availability.
- Credit sale customer eligibility.
- Supplier hold override approval.
- Cash variance threshold approval.
- Setting lock rules after transaction history exists.

These should still be supported by database indexes and candidate keys where possible.
