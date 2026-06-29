# Business Principles

These principles govern all future Orix Retail OS workflows, services, database design, UI
behavior, and reports.

## Completed Sales Are Immutable

Completed sales represent customer-facing commercial facts. They may have printed receipts, changed
stock, changed cash, and affected customer balances.

Why: editing a completed sale would make receipts, inventory, cash, audit history, and reports
disagree. Corrections must happen through cancellation, return, or adjustment workflows.

## Financial History Is Immutable

Posted financial records cannot be edited or deleted through normal business workflows.

Why: cash, receivables, payables, expenses, and profit reports must be trustworthy. Corrections must
preserve the original fact and add a reversing or correcting fact.

## Every Inventory Movement Is Traceable

Stock changes only through inventory transactions.

Why: retail teams must be able to explain why stock changed, especially when investigating shrinkage,
supplier shortages, cashier mistakes, or stock count differences.

## Every Financial Movement Is Traceable

Cash, customer balances, supplier balances, revenue, purchases, and expenses must come from
ledger-impacting business records.

Why: no balance should exist without a source document or approved opening entry.

## No Hidden Balance Adjustments

The system must not silently overwrite customer, supplier, cash, or stock balances.

Why: hidden adjustments create support nightmares and make fraud or operational errors difficult to
detect.

## Reports Derive From Transactional Data

Reports must calculate from accepted transactional records rather than independent report-only
figures.

Why: the same sale, payment, purchase, stock movement, or expense should explain operational screens,
dashboards, and printed reports.

## Offline-First Is Mandatory

Core workflows must complete without internet access.

Why: many retail environments in Pakistan have unreliable connectivity. Sales, purchases, payments,
stock updates, daily closing, and backups must not depend on a remote service.

## Every Critical Action Is Auditable

Business-critical actions must record who acted, when, what changed, and why where a reason is
required.

Why: retail businesses need accountability for cash, stock, credit, settings, users, backup, and
restore.

## Backups Must Be Restorable

Backup success is not meaningful unless the backup can be validated and restored.

Why: local-first desktop software depends on disciplined data protection. A customer must be able to
recover from hardware failure, corruption, or accidental loss.

## User Actions Are Attributable

Every business action should be attributable to a user or system actor.

Why: sales by cashier, cash discrepancies, stock adjustments, settings changes, and audit reviews all
depend on reliable attribution.

## Daily Operation Has a Business Boundary

Retail activity should belong to a business day that can be opened and closed.

Why: Pakistani retailers often reconcile cash, sales, expenses, credit collections, and stock issues
by day. Business day boundaries make closing, reporting, and accountability practical.

## Printing Failure Must Not Corrupt Business Truth

Receipt or report printing can fail after a business transaction succeeds.

Why: printers are hardware-dependent. A successful sale must remain completed even if the receipt
printer is unavailable; the system should support safe reprint rules.

## Future Synchronization Must Respect Local Truth

Future cloud sync or mobile apps must treat local posted records as durable business facts.

Why: offline-first operation means the local store may keep trading while disconnected. Sync must
reconcile facts, not overwrite them casually.
