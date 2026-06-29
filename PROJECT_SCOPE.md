# Project Scope

This document defines the planned Version 1.0 scope for Orix Retail OS at the business capability
level. It is not an implementation checklist and does not define database tables, services, UI, or
technical contracts.

## Included in Version 1.0

- Single-store offline desktop operation
- Store profile setup
- Local users with role-based permissions
- Customers
- Suppliers
- Products
- Categories
- Brands
- Units
- Sales and sale items
- Purchases and purchase items
- Customer payments
- Supplier payments
- Cash accounts
- Expenses
- Inventory tracking through inventory transactions
- Basic ledger-derived balances
- Audit logs for material actions
- Operational reports
- Settings for core behavior
- Local backup and restore
- Windows installer-ready product direction

## Excluded from Version 1.0

- Multi-branch operations
- Cloud synchronization
- Web or mobile applications
- E-commerce integrations
- Advanced accounting suite
- Full chart-of-accounts management
- Payroll
- HR management
- Loyalty program
- CRM campaigns
- Supplier portals
- Customer portals
- Advanced warehouse management
- Manufacturing
- Multi-currency accounting
- Tax filing automation
- Online payment processing
- Bank feeds
- AI analytics

## Future Roadmap

- Product variants
- Barcode scanner workflows
- Batch and expiry tracking
- Serial numbers
- Purchase orders and partial receiving
- Sales returns and exchanges
- Loyalty and customer groups
- Supplier statement reconciliation
- Cash drawer sessions and reconciliation
- Bank deposits and bank reconciliation
- Advanced report builder
- Scheduled reports
- Encrypted and scheduled backups
- Multi-store support
- Optional cloud backup and sync

## Non Goals

- Orix Retail OS is not a cloud-first SaaS product.
- Orix Retail OS is not an accounting replacement for complex enterprise finance teams.
- Orix Retail OS is not a web-only POS.
- Orix Retail OS is not an e-commerce platform.
- Orix Retail OS does not require internet access for core operation.
- Orix Retail OS should not expose technical setup tasks to retail customers.

## Success Criteria

- A non-technical retail customer can install and operate the software on Windows.
- Core sales, purchase, inventory, payment, and reporting workflows work offline.
- Business balances are derived from reliable transaction history.
- Stock is derived from inventory transactions, not arbitrary product edits.
- Material business actions are audit logged.
- Backup and restore are understandable and reliable.
- The architecture keeps business rules outside React components.
- Repositories remain free of business logic.
- Future modules can be added without collapsing package boundaries.
