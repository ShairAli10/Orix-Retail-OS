# Audit verification evidence

Companion to [the production audit](./production-audit-2026-09-23.md). All mutations below used disposable databases under `/tmp/orix-production-audit-runtime`; no shop database was used.

## Automated checks

- Initial `pnpm check`: lint passed, typecheck passed, Vitest 47 passed / 4 failed.
- `file` identified the installed native SQLite module as `PE32+ executable (DLL) (GUI) x86-64, for MS Windows`; host Node was `v20.19.1 arm64` on macOS.
- Temporary compatible SQLite module installed outside the repository; a process-local native-module override supplied it to Vitest. Result: 16 test files passed, 51 tests passed.
- `pnpm build`: successful workspace build and desktop main/renderer bundles.
- `pnpm audit --prod --json`: Drizzle ORM 0.38.4, high severity, GHSA-gpj5-g38j-94v9. This is dependency exposure, not a demonstrated injection exploit in this app.

## Main-process reproductions

The harness imports a copy of the built desktop main bundle, intercepts `ipcMain.handle` registration with a map, and calls the handlers using normal request payloads. It uses real SQLite, migrations, repositories and application services. Only the Electron window/dialog/lifecycle shell is replaced. This bypasses UI visibility deliberately to test the main-process trust boundary.

| Action                                                             | Actual result                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Initial setup                                                      | Success; authenticated.                                                              |
| Logout                                                             | `authenticated: false`, `locked: true`.                                              |
| Call users list after logout                                       | `ok: true`.                                                                          |
| Save settings after logout                                         | `ok: true`.                                                                          |
| Replay store setup after logout                                    | `ok: true`; store name replaced; `authenticated: true`.                              |
| Create Viewer, log in as Viewer, create product with opening stock | All returned `ok: true`.                                                             |
| Complete a 1,000-minor-unit item with a 200 discount               | Sale total 800.                                                                      |
| Fully return that item for cash                                    | Refund 1,000.                                                                        |
| Read cash register after that refund                               | Expected cash still 800.                                                             |
| Verify a SQLite database with only one `stores(id)` row            | `valid: true`, “Backup is valid and restorable.”                                     |
| Complete a 1,000 sale with 1,500 tendered                          | Success; expected cash changed from 1,800 to 2,300, a delta of 500 instead of 1,000. |
| Invoke two catalog saves concurrently with `Promise.allSettled`    | One rejected with `SQLITE_ERROR`; one returned `APPLICATION_TRANSACTION_FAILED`.     |

A duplicate-item return probe returned an error; this audit does **not** claim that duplicate-line over-return was reproduced.

## Desktop observations

Launched the built renderer in Electron 33.4.11 with an isolated user-data directory, isolated Electron-compatible SQLite module, and original preload. Used the agent-browser skill over a local debugging port; the audit process was stopped after checking.

- Login and dashboard worked. Items list showed the probe product.
- Forgot Password was disabled.
- Item filter comboboxes had no accessible names in the snapshot.
- Opening Add Item produced one `.modal`, zero native dialogs or `[role=dialog]`, and left focus on the background Add Item button.
- Pressing Tab with the modal open focused the background `#product-search`; `insideModal` was false. Focus is not contained.
- Escape closed the tested modal.
- Content viewport was 1,366 × 740; no document-level horizontal overflow in this tested state.
- Screenshot capture failed because the browser automation daemon became busy/unresponsive. No screenshot or visual pixel/contrast verification is claimed.

No clean Windows installation, hardware receipt output, power interruption, interrupted restore or exhaustive UI journey was validated. Source-only findings in the main report retain that qualification.
