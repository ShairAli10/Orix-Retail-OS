# Single-counter acceptance — 29 September 2026

Scope: one store, one offline Windows computer, one counter. No subscription or activation-code product is required.

## Batch 2 evidence

- Full quality command: `pnpm check` (lint, typecheck, build, Vitest/database checks).
- Complete Electron suite: 15 journeys passed on macOS, including crash recovery, onboarding, stock, sales/returns, customer/supplier dialogs, reports, settings, counter closing and POS hold/reload/resume.
- Responsive journey checks the main pages in light/dark themes at 800, 1024, 1280 and 1440px and opens key drawers/forms.
- Journeys now copy the seed into separate temporary profiles. Previously, closing the shared demo day in one test caused later financial journeys to fail. Isolation does not reset or modify the normal demo or production profiles.
- Removed dead customer/supplier Payments/Notes/Purchases tab state and unreachable Notes panel. Updated a stale Sales History test locator to the current View details action.

The combined purchase journey uses UI forms to save a draft, receive two items, return one, pay the supplier twice, sell the remaining item, record an expense, and close with matching cash. IPC reads assert stock, supplier balance and cash after each step. Closing state and balances survive a renderer reload. Other journeys cover customer returns and held-basket recovery; this is representative coverage, not proof of every payment/return combination.

## Remaining before live use

1. Windows installer and update acceptance on the actual workstation, including scanner, receipt printer, scaling, offline launch and sustained trading.
2. Off-device backup restoration and migration/update recovery on an isolated installation.
3. Trusted build environment and dependency/security review; prior workstation/remote-code concerns are not cleared by these functional tests.
4. Store-owner acceptance of account-level supplier payments and supported payment/expense correction procedures.
5. Interrupted-payment recovery after the payment form is closed/reloaded still requires checking the account before re-entering it. The same open form carries its retry ID.
6. Final version, commit/tag, Windows installer, matching symbols and operator handoff.

Do not delete applied migrations or seed production with demo data. Existing payment history is not rewritten. Batch 3 prepares the release; actual hardware and recovery acceptance remain mandatory.

## Batch 3 preparation

Desktop version is now `0.1.0-rc.2`. Windows CI is configured to build the actual NSIS installer, calculate its SHA-256 checksum, and record the commit/workflow identity. Installer files and maintainer support files are retained as separate artifacts. Manual workflow dispatch is available.

Follow the [Windows rollout checklist](windows-rollout-checklist.md) for installation, peripheral testing, backup restoration, update acceptance and operator handoff. No Windows installer execution, target-machine signoff or release tag is claimed by this preparation. Previously recorded macOS journey evidence predates this packaging-only batch.

Batch 3 local validation: `pnpm check` passed lint, typecheck, build and all 80 tests across 29 files after the version change. Changed release files passed Prettier checks and `git diff --check` reported no whitespace errors. The Windows workflow itself has not been executed in this macOS session; no installer artifact has been produced here.

## Windows CI evidence — 29 September 2026

[Desktop quality run 36597372987](https://github.com/ShairAli10/Orix-Retail-OS/actions/runs/36597372987) succeeded for commit `a82ff052bf5069d954679e3755821ee5031f921f` (desktop `0.1.0-rc.2`):

- Windows lint, typecheck, build and all 80 tests across 29 files passed.
- All 15 Electron journeys passed on the Windows runner.
- NSIS x64 installer packaging and installer-identity generation succeeded.
- Installer/checksum/build record and matching support/symbol artifacts were uploaded with 90-day retention.

The first Windows runs exposed test-harness differences: the initial login needed a distinct readiness wait, and forced termination needed to stop the entire Electron process tree and wait for Windows to release the profile lock before relaunch. The recovery assertion remains enabled and passed; no failing journey was skipped.

This evidence supersedes the earlier statement that Windows CI had not run. It does **not** establish successful installation/update of the packaged executable, physical printer/scanner compatibility, off-device recovery or owner acceptance. Those rollout checklist gates, including the security review, remain pending. Use the artifacts from the exact run above; later documentation-only commits do not change that build identity.
