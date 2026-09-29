# Windows diagnostics and manual updates

The desktop version is now `0.1.0-rc.2`. This is a release candidate, not a production certification. Windows installer, actual printer/scanner, dependency maintenance, and remaining financial/recovery acceptance gates still apply.

## Store support workflow

1. After an unexpected stop, restart Orix and check Sales History before retrying a payment.
2. Sign in as Owner. Open **Settings → Support → Export Diagnostics**.
3. Choose a writable location for the ZIP and send it to the agreed support contact. Export does not transmit anything automatically. Cancellation creates no success notification.
4. Include the approximate incident time and the action being performed. Avoid sending passwords, PINs, customer records, or the database.

If the app cannot open, the fatal-error dialog shows the local diagnostics directory. It is the `diagnostics` folder inside Electron's user-data directory (normally under `%APPDATA%` on Windows). Support can collect the structured `events-*.jsonl` files and `session.json`. Do **not** send the `native` folder by default.

## What is recorded

Structured JSON lines capture startup/shutdown, migration outcomes, failed operations, JavaScript failures, renderer failures, and unresponsive/responsive events. Records include app version, build fingerprint, UTC time, a filtered error code and bundled-code line/column locations. Raw exception messages, SQL, request payloads, personal file paths and store records are excluded. The export reconstructs only allowed fields.

Logs rotate at 1 MiB per file, with at most five files. Files older than 14 days are removed at startup. Logging write failure does not throw into checkout; the UI exposes logging-unavailable status. Records written just before sudden power loss can still be lost; an active-session marker makes the next startup report an unexpected shutdown.

Electron Crashpad is configured for local collection with uploads disabled. Native dumps may contain sensitive process memory and are excluded from exports. Retention sweeps at startup and every minute keep at most five dumps/50 MiB, removing dumps older than 14 days; locked files may survive until the next sweep. These are sweep limits, not a guarantee against a transient disk-usage spike. Windows native dump generation still needs target-machine testing.

A clean shutdown after a detected crash still preserves a recovery notice for the next session. A forced process kill is detected even if no error could be written.

## Matching a report to a fix

The manifest and each log record identify the build. The fingerprint hashes shipped main-process bundles, diagnostics bootstrap, preload and renderer assets. Keep the exact installer, bundled JavaScript, and source maps for every distributed release. A commit ID alone is insufficient for an uncommitted/local build.

The Windows CI workflow builds the NSIS installer and retains two separate artifacts for 90 days: `windows-installer-<commit>` (installer, SHA-256 checksum and build record), and `windows-support-and-symbols-<commit>` (unpacked app, bundles/maps, migration files and lockfile). The build record identifies the workflow run and explicitly marks this unsigned candidate as not yet accepted on the target machine. Archive actual distributed installers and matching symbols in long-term release storage. CI configuration is not evidence that the Windows workflow has run.

## Manual update procedure

1. Reproduce the reported issue against the matching build and add a failing regression test.
2. Increment the desktop version; run `pnpm check`, `pnpm test:e2e`, and Windows `pnpm dist:win`.
3. Test the installer on a copy of the existing store database, including offline startup and peripheral use. Keep an off-device verified backup.
4. Close the counter and exit Orix. Install the update outside trading hours using the same Windows account.
5. Start the app and confirm the version, stock/balances, recent sales, and printer operation before trading.

The existing NSIS app identity/user-data path stays unchanged. Before pending schema migrations, Orix checks stored migration hashes and creates a SQLite snapshot under `upgrade-backups`. Failure to create that snapshot blocks migration. Newer/incompatible migration histories block startup rather than silently opening under an older application. Pre-upgrade backups contain store data and are never included in diagnostics exports; they are not automatically deleted.

Do not roll back only the executable after a schema upgrade. Preserve both the upgraded database and pre-upgrade snapshot, and coordinate application/database recovery with support. Restoring a pre-upgrade snapshot discards later transactions. Automated update distribution, signing, automatic rollback, and migrations of old backup formats are not implemented here.

## Verification recorded on 2026-09-24

On macOS arm64, `pnpm check` passed lint, type checking, build, and 69 tests across 26 files. The diagnostics tests cover privacy filtering, rotation, unavailable storage, previous-build identity, native dump retention, and pre-migration backup/failure guards. The real-database desktop regression harness also checks diagnostics permissions and report throttling.

`pnpm test:e2e` passed three Electron journeys: counter checkout and basket recovery with diagnostics export success/cancellation/write failure; forced process termination followed by the recovery notice; and an actual forced renderer crash recorded before application exit. Python's independent ZIP reader verified the exported archive's CRCs and manifest. Test exports and screenshots are under ignored `test-results/`.

These checks do not establish Windows installer compatibility, native dump creation on Windows, physical power-loss durability, peripheral compatibility, or production readiness of all financial workflows. The scoped Support UI uses the existing design system; the broader static UI audit still identifies legacy form/control issues outside this change. Resolve the remaining gates in the single-counter handoff before live trading.

## Release candidate correctness update — 2026-09-29

Migration `0004_repeat_events_payment_retries` preserves existing events and replaces the entity/event uniqueness constraint with a normal lookup index, allowing repeated edits and archive/restore cycles. Event IDs remain unique. It adds a payment-request table so customer and supplier payments with the same request ID return the original result; changed request details are rejected. Request storage, payment, ledger and event writes share the service transaction.

Payment forms now display local wall-clock time and submit an ISO timestamp. Existing historical timestamps are not rewritten. The form retains its request ID during an interrupted-response retry, but closing/reloading the form creates a new request: check the account before re-entering payment details after such an interruption. Requests from older clients without a request ID do not gain retry protection.

This schema upgrade follows the existing pre-migration snapshot procedure. Older backups still require their matching application/schema; the in-app restore verifier does not migrate an old backup automatically. Preserve migration files and the pre-upgrade snapshot.

## Current installation checklist

Use [the Windows rollout checklist](windows-rollout-checklist.md) for clean installation, updates, recovery testing and store-owner signoff. The latest local evidence is in [single-counter acceptance](single-counter-acceptance-2026-09-29.md).
