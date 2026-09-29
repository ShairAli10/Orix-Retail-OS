# Windows rollout — 0.1.0-rc.2

One store, one Windows x64 computer, one counter. This document is a checklist, not a completed acceptance record. All boxes below remain pending until evidence is recorded.

## Prepare the release

- [ ] Review and commit the intended changes, including migration 0004. Keep previously applied migrations unchanged.
- [ ] Clear the previously identified workstation/remote-code security concern and review dependency risks. Build from a trusted checkout with the committed lockfile.
- [ ] Run **Desktop quality** on Windows (push to main or manual workflow dispatch). Require quality checks, Electron journeys and NSIS packaging to succeed for the same commit.
- [ ] Download both artifacts for that commit. Archive the installer, checksum, build record and matching support/symbol files beyond the CI retention period of 90 days.
- [ ] Check the installer checksum with PowerShell: `Get-FileHash .\Orix-Retail-OS-Setup-0.1.0-rc.2-x64.exe -Algorithm SHA256`. Compare with `SHA256SUMS.txt` from the trusted build. A checksum detects mismatches; it is not a publisher signature.

The installer is currently unsigned. There is no automatic update service. Do not treat an unsigned file from an unverified source as safe or disable Windows security protections to install it. Support files are for the maintainer; the store needs the installer and operating instructions.

## Test before putting store data into service

Use an isolated Windows account or test computer for destructive and recovery checks.

- [ ] Install using the intended Windows user account; launch offline and complete setup with test details. Confirm version 0.1.0-rc.2 and no demo products/accounts in a fresh installation.
- [ ] Verify Owner and Cashier access, then reopen after a Windows restart. Owner credentials must be private and recoverable through the agreed support procedure.
- [ ] At the actual display scaling, open every main page and key form. Confirm labels, totals, action buttons and scrolling remain usable.
- [ ] Scan real barcodes, complete a cash sale, check change and print/reprint on the actual receipt printer.
- [ ] Receive stock on supplier credit, record a partial payment, and confirm stock, supplier balance and cash. Supplier payments settle the account, not individual purchase invoices.
- [ ] Make a customer credit sale and payment. Return part of a multi-item sale, then return the remainder. Confirm remaining returnable quantities, stock handling, customer balance and cash/refund totals.
- [ ] Hold and resume a basket, record an expense, count cash, close the day and reopen the app. Confirm reports reconcile with the recorded transactions.
- [ ] Run a representative busy trading session. Check rapid scans, repeated clicks, long baskets and failed printing without creating duplicate sales/payments.
- [ ] On test data, force-close the app, restart and verify persisted transactions and the recovery notice. Export diagnostics and confirm Support shows the expected version/build reference.

## Prove backup and update recovery

- [ ] Create a backup from Settings → Data & backup. Copy it off the store computer to controlled storage.
- [ ] Restore that backup into an isolated installation of the matching application/schema. Compare recent sales, stock, customer/supplier balances and cash; reopen once more.
- [ ] For an existing installation, test rc.2 against an isolated copy of its actual prior-version profile. Confirm a pre-migration snapshot exists, migration succeeds and balances/history remain intact.
- [ ] Keep the previous installer, pre-upgrade snapshot and upgraded database separately. An old executable alone cannot safely roll back an upgraded database. Recovery to a pre-upgrade snapshot loses later transactions; reconcile those before resuming.

Do not use the live store profile for crash/restore experiments. In-app restore does not automatically migrate old backup formats. Do not delete migrations, copy demo data into production, or manually edit database balances.

## Store handoff and first day

- [ ] Install the accepted build outside trading hours. For updates, close the day, make a verified off-device backup, exit Orix and use the same Windows account.
- [ ] Enter real store settings and opening balances/stock once; reconcile them against the physical count and account records. Create real staff credentials, not demo credentials.
- [ ] Agree how to handle payment/expense mistakes with support. After an interrupted payment, inspect the account before entering it again; closing/reloading its form creates a new request ID.
- [ ] Choose a backup location, responsible person and daily off-device copy routine. Demonstrate backup creation and diagnostic export to the owner.
- [ ] Record acceptance below, then tag the exact accepted commit (proposed tag: `v0.1.0-rc.2`). Keep the tag, installer checksum and support files together.
- [ ] Reconcile the first live day's cash, stock movements and account balances with the owner before considering the rollout complete.

## Acceptance record

| Field                              | Recorded evidence |
| ---------------------------------- | ----------------- |
| Accepted by / date                 | Pending           |
| Commit / CI run                    | Pending           |
| Installer SHA-256                  | Pending           |
| Support build reference            | Pending           |
| Windows version / scaling          | Pending           |
| Scanner / receipt printer          | Pending           |
| Trading and reconciliation results | Pending           |
| Backup restore / update test       | Pending           |
| Security/dependency review         | Pending           |
| Support contact / backup owner     | Pending           |

Local macOS checks and their limitations are recorded in [single-counter acceptance](single-counter-acceptance-2026-09-29.md). Diagnostic collection and update recovery are described in [Windows support](windows-support-and-updates.md).
