# SQL import — review and posting

Settings → Data & backup → Start import accepts one supported previous-POS SQL dump, up to 64 MB. The dump is parsed as data; its SQL commands are never executed. CSV is not needed in this flow.

## Owner journey

1. Choose the SQL export. Check the source store and latest-sale date, shown in the computer's local time. An old export is not today's stock count.
2. Review products. Edit names, barcodes, prices and verified opening quantities; exclude unwanted or unsupported rows. Negative quantities and duplicate included barcodes block posting. Non-stock products, pack conversions, missing/repeated quantity records require exclusion or a corrected source export.
3. Review customer and supplier contacts. Existing matching contacts are rejected to prevent accidental duplication. No previous debts or credit limits are inferred.
4. Read the summary and confirm quantities, warnings and the exclusion of historical transactions/balances. Click **Create backup & import**.
5. Orix creates and verifies a fresh backup, then imports the selected records together. The completion panel shows counts, opening stock value and backup location. **Download import report** exports the originals, corrections, exclusions, source-to-Orix mappings and completed result.

Products appear in Items and Stock. Contacts appear in Customer Book and Suppliers. The latest result remains available after restarting Orix.

## Data integrity

- File identity is checked again in the main process using SHA-256; changing the source requires a new review.
- Main-process validation repeats product/contact checks and rejects existing barcode/contact conflicts before creating the backup.
- Stock quantities and stock cost are read back and reconciled before committing.
- Catalog rows, products, contacts, opening stock, source mappings, completed job and business event are one SQLite transaction. A failed write or reconciliation rolls them all back.
- Backup failure prevents posting. A backup created before a later failure remains available.
- Repeating the same file returns its original completed result, even after restart; it does not apply later draft edits or add stock again. To correct imported data, use the normal Items/Stock/contact workflows.
- A changed export cannot repost previously mapped source IDs. Exclude already imported rows to import additional source records.
- Migration `0005_legacy_import` adds durable jobs and mappings. Earlier migration files are unchanged. Follow the existing snapshot/restore policy for schema upgrades.
- Review drafts are saved in this computer's browser profile, keyed to the source hash. SQLite backups contain completed import reports, but not unfinished drafts.

## Scope and exclusions

This imports active products, categories, units, prices, verified opening stock and customer/supplier contact details. It does not import historical sales, payments, expenses, movements, archived products, account balances, passwords or sessions. History must not be replayed into current cash or stock. Keep the original export for a separate historical archive project.

The supplied file was inspected read-only: 2,387 active products, 318 archived products, four contacts, 437 negative-stock rows and one unsupported non-stock product. No live store database was imported or reset during development.

## Release status

Implemented locally. The published rc.4 installer does not contain this feature. Run the Windows build workflow and packaged startup checks before distributing an updated installer. Separate Data & backup/Users layout polish remains outside this import transaction change.

Validation covers parser failures, review corrections, backup failure, event-write rollback, stock-cost reconciliation, unverified backups, exclusions and repeated imports. The Electron journey uses synthetic SQL and an isolated database/backup directory to review, save/reload, import, restart, retry and confirm the new product is visible. Final local checks: lint, TypeScript and production build passed; 98 unit/integration tests and all 18 Electron journeys passed. The final backup-panel refresh also passed targeted lint and the full Electron suite. Preview screenshots were checked at 1440px/800px and the completed result at 800px.

## Start again after testing

Settings → Data & backup → **Reset store data** prepares Orix for another fresh import while the previous POS remains in use. This is a reset, not a merge or synchronization.

- Close the counter first. An owner must enter their password and type `RESET STORE DATA`.
- Orix creates a verified backup before clearing anything. Failure leaves trading data intact.
- Removes products/catalog, stock and stock counts, contacts, sales/held sales, returns, purchases, payments, expenses, counter sessions and import mappings/results. The same SQL contents can then be imported again.
- Keeps store configuration, user accounts/passwords/roles, backup files and records, and audit history. Business-day identity rows are retained for audit references with cash totals and trading state reset.
- Clears local saved baskets, import review drafts and readiness confirmations. Reload Orix from the completion screen before importing.
- Reset writes and its audit record are atomic. Do not use it to refresh stock after Orix becomes the store’s live system; it removes all current trading records. Restore the pre-reset backup through Backup & restore if recovery is needed.

Visible labels use “previous POS.” The supported SQL structure is unchanged; arbitrary vendors’ SQL dumps still require a compatible mapping.

Reset verification: 100 unit/integration tests passed, including backup failure, rollback and reimport after reset. The isolated Electron journey verifies wrong-password rejection, open-counter rejection, confirmed reset, successful reload, empty products/import history and preserved user accounts. No reset was performed on the working store database.
