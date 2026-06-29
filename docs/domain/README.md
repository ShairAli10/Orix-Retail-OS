# Business Domain Blueprint

This directory is the source of truth for Orix Retail OS business domains.

It defines what each domain owns, what it must never own, how business lifecycles work, which
events matter, which permissions are expected, and which dashboard metrics each domain contributes
to.

This is not an implementation design. It must not be treated as a database schema, service map, IPC
contract, or UI specification.

## Domain Interaction Model

Orix Retail OS is built around a local retail business ledger. Commercial actions create business
events. Business events affect stock, cash, balances, reports, and audit history.

The main flow is:

```text
Store setup
  -> users, roles, permissions, settings
  -> suppliers, customers, products, categories, brands, units
  -> purchases and sales
  -> inventory transactions, payments, cash accounts, expenses
  -> ledger and reports
  -> audit logs, backup, restore
```

## Domain Groups

- [Store](./Store.md) covers store identity and operating context.
- [Customer](./Customer.md) covers customers.
- [Supplier](./Supplier.md) covers suppliers.
- [Inventory](./Inventory.md) covers products, categories, brands, units, inventory, and inventory
  transactions.
- [Purchases](./Purchases.md) covers purchases and purchase items.
- [Sales](./Sales.md) covers sales and sale items.
- [Payments](./Payments.md) covers customer payments, supplier payments, cash accounts, and
  expenses.
- [Ledger](./Ledger.md) covers financial ledger and audit logs.
- [Reports](./Reports.md) covers business reporting.
- [Settings](./Settings.md) covers users, roles, permissions, and settings.
- [Backup](./Backup.md) covers backup and restore.

## Event Principles

Events are business facts, not implementation messages. Future code may implement them using
application services, internal event handlers, transaction boundaries, or durable audit records, but
the business meaning must remain stable.

Events should be named in past tense:

- Sale Completed
- Purchase Received
- Customer Payment Recorded
- Inventory Adjusted
- Expense Recorded

## Permission Principles

Permissions are role capabilities, not hard-coded user checks. Future implementation must evaluate
permissions through a single authorization policy rather than scattering checks across UI screens.

Every domain recognizes these capabilities where applicable:

- View
- Create
- Edit
- Delete
- Approve
- Cancel

## Accounting Principles

Balances must be derived from ledger-impacting business events. Customer balances, supplier
balances, cash balances, receivables, payables, sales totals, purchase totals, and expense totals
must not be maintained as independent business truth when they can be calculated from accepted
financial records.

## Inventory Principles

Stock quantity must be derived from inventory transactions. Sales, purchases, returns, adjustments,
and transfers should create inventory movements rather than directly overwriting stock balances.

Negative inventory is disabled by default.

## Audit Principles

Material business actions must produce audit history. Audit logs explain who did what, when it was
done, and which business record was affected. Audit logs must not become editable business records.
