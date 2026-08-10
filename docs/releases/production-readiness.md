# Production Readiness Plan

This document defines what remains before Orix Retail OS can be released to real retail customers.
It is a release planning document, not a feature specification. Approved RFCs, domain documents, and
workflow documents remain the source of truth for business behavior.

## Current Product Status

Orix Retail OS has moved beyond architecture-only work. The repository now contains a working
offline desktop foundation with a real Electron shell, SQLite persistence, typed IPC, application
services, repository layer, RBAC, product management, inventory management, customer account book,
supplier and purchase workflows, POS checkout, legacy stock import, theming, and form validation.

The product is suitable for internal demos and controlled engineering testing. It is not yet ready
for a shop installation because several operational workflows, recovery flows, reports, installer
packaging, and Windows-specific checks remain incomplete.

## Release Readiness Legend

- Complete: implemented, verified, and suitable for beta use after QA.
- Partial: implemented enough to test, but missing important production behavior.
- Missing: not implemented or not usable by a customer yet.
- Needs hardening: works, but requires stronger tests, edge-case handling, or production polish.

## Module Status

| Area              | Status          | Notes                                                                                                                                                           |
| ----------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop shell     | Partial         | Navigation, theme, status bar, and shell exist. Needs full laptop QA and remaining alignment cleanup.                                                           |
| First-run setup   | Partial         | Store, branch, and admin setup exist. Needs stronger recovery and duplicate setup handling.                                                                     |
| Authentication    | Partial         | Login, PIN login, lock screen, and roles exist. Needs password hashing/security review and admin recovery.                                                      |
| RBAC              | Partial         | Sidebar/actions are permission-aware. Needs full permission audit across IPC and services.                                                                      |
| Products/items    | Partial         | CRUD, archive/restore, catalog groups, validation, and persistence exist. Needs duplicate edge-case QA and import reconciliation.                               |
| Inventory         | Partial         | Transaction-based stock, adjustments, opening stock, stock take, overview, low/out stock views exist. Needs stronger audit review screens.                      |
| Customers         | Partial         | Customer CRUD, payments, account book, statements, and dashboard metrics exist. Needs printable/export polish and sale integration hardening.                   |
| Suppliers         | Partial         | Supplier CRUD, payments, statement, purchases, and payables exist. Needs reconciliation workflow and better payable aging.                                      |
| Purchases         | Partial         | Draft, receive, cancel, supplier integration, purchase returns, and stock/ledger effects exist. Needs partial receiving decisions.                              |
| POS               | Partial         | Search/barcode entry, cart, sale completion, held sales, receipts, cash register basics, payment guardrails, and failure recovery exist. Needs hardware checks. |
| Sales history     | Partial         | Sales list, receipt retrieval, and sales returns exist. Needs deeper filters and printable return receipts.                                                     |
| Ledger            | Partial         | Ledger-derived balances exist through workflows. Needs ledger review screen and consistency diagnostics.                                                        |
| Expenses          | Missing/Partial | Expense domain exists in architecture; production workflow still needs completion and UI review.                                                                |
| Reports           | Missing         | Dashboards exist, but formal printable/exportable reports are not complete.                                                                                     |
| Backup            | Partial         | One-click backup, verification, restore confirmation, and backup-before-import exist. Needs scheduler, retention, and restore-preview hardening.                |
| Legacy import     | Partial         | Previous software stock import exists. Needs rollback report, backup-before-import, and more sample formats.                                                    |
| Windows installer | Partial         | NSIS installer build exists with upgrade-safe app data policy. Needs clean Windows install and upgrade QA on target hardware.                                   |
| Documentation     | Partial         | Architecture docs are strong. Customer/admin docs are missing.                                                                                                  |
| Testing           | Partial         | Unit/integration tests exist. Needs Playwright/Electron E2E and manual QA scripts.                                                                              |

## Beta Blockers

These must be completed before installing the product for a real shop beta.

1. Backup and restore
   - One-click manual backup.
   - Restore wizard.
   - Backup verification.
   - Backup-before-import protection.
   - Clear backup location in settings.

2. Windows installer
   - Build Windows installer from macOS or CI. Complete from macOS.
   - Validate native SQLite dependency packaging. Complete for packaged artifact inspection.
   - App icon, metadata, version, install path, and uninstall behavior. Partial; real Windows QA remains.
   - Fresh install test on a clean Windows machine.

3. POS hardening
   - Sale completion failure handling.
   - Receipt print path, even if hardware support starts as system print.
   - Held sale persistence and recovery verification.
   - Cash session reconciliation rules.

4. Data safety
   - Database integrity check on startup or diagnostics screen.
   - Migration/import rollback report.
   - Audit trail review for critical actions.
   - No hard delete for business records.

5. Laptop responsiveness
   - Verify at 1366x768 and 1920x1080.
   - Verify light, dark, and system themes.
   - Check no text overlap in POS, Items, Stock, Customers, Suppliers, Purchases, Settings.
   - Check modal heights on laptop screens.

6. Minimum reports
   - Daily sales.
   - Cash drawer.
   - Inventory value.
   - Low stock.
   - Customer receivables.
   - Supplier payables.

## Version 1.0 Blockers

These can come after beta but must be complete before calling the product Version 1.0.

1. Returns
   - Sales returns. Complete for original-document returns.
   - Purchase returns. Complete for original-document returns.
   - Inventory reversal rules. Complete for return transactions; broader reversal tooling remains.
   - Ledger reversal rules. Complete for return transactions; broader reversal tooling remains.

2. Stock take
   - Count workflow. Complete.
   - Variance review. Complete.
   - Approval-ready adjustment posting. Partial; approval metadata exists, second-user approval remains future hardening.

3. Reporting suite
   - Sales report.
   - Inventory valuation report.
   - Stock movement report.
   - Customer statement export/print.
   - Supplier statement export/print.
   - Expense report.
   - Profit/margin report if cost data is reliable enough.

4. Security hardening
   - Password hashing review.
   - PIN storage review.
   - Session timeout policy.
   - Admin recovery procedure.
   - Permission enforcement audit at IPC and application-service layers.

5. Operational documentation
   - Installation guide.
   - First-run setup guide.
   - Daily sales guide.
   - Backup and restore guide.
   - Old software import guide.
   - Troubleshooting guide.

6. Production QA
   - End-to-end test suite.
   - Manual QA checklist.
   - Crash recovery test.
   - Power-loss transaction test.
   - Upgrade test with existing database.

## Recommended Implementation Phases

### Phase 8: Backup and Restore

Goal: make customer data recoverable before more data-heavy features are added.

Deliverables:

- Backup page in Settings.
- Create backup now.
- Select backup location.
- Restore from backup wizard.
- Backup verification result.
- Backup-before-import requirement.
- Documentation for backup and restore.

Exit criteria:

- A non-technical user can create and restore a backup without touching files manually.
- Restore is blocked or clearly warned when unsafe.
- Import flow prompts for backup first.

### Phase 9: Reports MVP

Goal: give shop owners daily operational visibility.

Deliverables:

- Daily sales report.
- Cash drawer report.
- Inventory value report.
- Low stock report.
- Customer receivables report.
- Supplier payables report.
- Print and CSV export.

Exit criteria:

- Reports derive from transactional data.
- Reports work with empty data and real imported data.
- Reports fit laptop screens and print cleanly.

### Phase 10: POS Production Hardening

Goal: make the heart of the system reliable for daily checkout.

Deliverables:

- Receipt print flow.
- Cash drawer status abstraction.
- Held sale recovery QA.
- Sale failure recovery messages.
- Better cash received/change guardrails.
- POS keyboard workflow QA.

Exit criteria:

- A cashier can complete normal sales without training friction.
- Failed sale attempts do not leave partial inventory or ledger changes.
- Receipts can be printed or previewed reliably.

### Phase 11: Returns and Reversals

Goal: support real retail corrections without hidden edits.

Deliverables:

- Sales return workflow.
- Purchase return workflow.
- Inventory reversal transactions.
- Ledger reversal entries.
- Audit logs.
- Return receipt printouts remain future polish.

Exit criteria:

- Completed sales/purchases remain immutable.
- Returns reference original documents.
- Stock and balances are corrected through traceable transactions.

Status: Complete for beta workflow coverage. Return receipt printing and approval policy remain
Version 1.0 polish.

### Phase 12: Stock Take

Goal: allow shops to reconcile real shelf stock with system stock.

Deliverables:

- Stock count session.
- Count entry screen.
- Variance review.
- Adjustment posting.
- Printable count sheet.

Exit criteria:

- Stock changes only through inventory transactions.
- Variances are auditable.
- Large counts remain usable on laptop screens.

Status: Complete for beta workflow coverage. Partial counts, second-user approval, and
barcode-assisted count entry remain Version 1.0 polish.

### Phase 13: Windows Installer and Upgrade Path

Goal: make the product installable by a non-technical customer.

Deliverables:

- Windows installer.
- App metadata and icon.
- Native dependency packaging.
- Database location policy.
- Upgrade test.
- Uninstall behavior.

Exit criteria:

- Clean Windows install works without developer tools.
- App opens after install.
- Existing database survives upgrades.

Status: Partial. The NSIS installer and unpacked Windows app build successfully from macOS, package
migrations and native SQLite correctly, and preserve the app data directory across upgrades.
Clean Windows installation and install-over-existing-app testing remain required on target hardware.

### Phase 14: Security and Permission Audit

Goal: close obvious security and authorization gaps before release.

Deliverables:

- Password/PIN storage review.
- IPC permission audit.
- Service authorization audit.
- User disable behavior.
- Lock timeout setting.
- Admin recovery procedure.

Exit criteria:

- Restricted users cannot access forbidden actions through UI or IPC.
- Disabled users cannot continue operating after lock/logout.
- Owner recovery path is documented.

### Phase 15: Production QA and Documentation

Goal: prepare for beta installation and support.

Deliverables:

- Manual QA checklist.
- Playwright/Electron E2E coverage.
- User manual.
- Admin guide.
- Backup/import guide.
- Known limitations list.

Exit criteria:

- Beta checklist can be repeated for every build.
- Support can diagnose common failures.
- Customer-facing docs avoid technical language.

## Laptop Responsiveness Requirements

The product must feel comfortable on common Pakistani retail laptops, not only large monitors.

Required viewports:

- 1366x768
- 1440x900
- 1536x864
- 1920x1080

For every supported viewport:

- Sidebar must not crowd the main workflow.
- POS cart and payment panel must remain usable without awkward scrolling.
- Dialogs must fit vertically or scroll internally.
- Tables must keep primary actions reachable.
- Text must not overlap or truncate critical values.
- Light, dark, and system themes must all be checked.

Priority screens:

- Login
- First-run setup
- Dashboard
- POS
- Items
- Stock
- Customers
- Suppliers
- Purchases
- Settings
- Backup and restore once implemented

## Minimum Beta Acceptance Criteria

Orix Retail OS can enter beta only when all of these are true:

- App installs on Windows without developer tools.
- App works fully offline.
- First-run setup creates store, branch, and owner user.
- Owner can create items, customers, and suppliers.
- Cash sale can be completed and receipt previewed/printed.
- Inventory is changed only through transactions.
- Customer and supplier balances are transaction-derived.
- Backup and restore work.
- Old stock import requires a backup and produces a clear result report.
- Critical actions are audit logged.
- Laptop screens are usable at 1366x768.
- No known data-loss bugs remain open.

## Minimum Version 1.0 Acceptance Criteria

Version 1.0 requires beta criteria plus:

- Sales returns and purchase returns.
- Stock take workflow.
- Reports MVP.
- Windows upgrade path.
- Permission audit complete.
- Customer-facing user guide complete.
- Manual QA checklist passed on a clean Windows machine.

## Current Recommendation

Backup and Restore, Reports MVP, POS hardening, returns, stock take, and Windows installer
packaging now have usable foundations. The next implementation phase should focus on
security/permission audit, followed by production QA documentation and real Windows upgrade testing.
