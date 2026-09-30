# Security review — 30 September 2026

**Decision: not yet cleared for live store use.** Functional acceptance and successful installer packaging do not resolve the findings below. This review does not certify the workstation or the application as free of vulnerabilities.

## Scope and evidence

Reviewed the current working tree on main, desktop main/preload/renderer boundaries, IPC authorization, authentication, backups, diagnostics, dependency lockfile, and the previously reported injected ESLint configuration. No production store data was modified. No historical injected code was executed.

`pnpm audit --json` reported 97 advisory entries: 1 critical, 52 high, 37 moderate, and 7 low. Entries can repeat the same advisory across dependency paths/version ranges; this is not 97 independently exploitable application bugs. `pnpm audit --prod --json` reported one high advisory, but excludes Electron because it is declared as a development dependency even though its runtime ships in the installer. Audit results are a point-in-time snapshot.

## Release blockers

### 1. Previously injected development code: workstation trust remains unresolved

Historical commit `9f6242f79799577c705e070e2fcc6774f6fcb58d` contained an obfuscated loader in `eslint.config.mjs` capable of fetching and evaluating remote code and starting a detached process. The current configuration contains ordinary ESLint setup and no such loader. A narrow scan of tracked text files found no matching obfuscation signatures, private-key headers, or selected common token patterns. These checks are not a complete secret scan or incident investigation.

Removing the loader does not establish what ran previously, whether credentials were accessed, or whether persistence remains. Before handling live credentials or producing a trusted release, investigate the affected workstation, review account activity, and revoke/rotate potentially exposed credentials from a trusted device. Build from a reviewed checkout on a trusted environment. Do not execute the historical configuration to investigate it.

### 2. Shipped Electron runtime has known vulnerabilities

The lockfile resolves Electron **33.4.11**. The audit reports multiple runtime advisories and this release line is outside Electron's maintained release window. Renderer isolation reduces exposure but does not replace runtime security updates.

Upgrade to a maintained Electron release, rebuild native SQLite, and rerun Electron journeys and Windows installer, upgrade, printing, and recovery checks. See [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security) and [release support timelines](https://www.electronjs.org/docs/latest/tutorial/electron-timelines).

### 3. Production ORM dependency has a high-severity advisory

Drizzle ORM **0.38.4** is affected by an identifier-escaping advisory; **0.45.2** is the first patched version listed. Reviewed sort paths use a column allowlist, and reviewed explicit identifiers come from static schema helpers. No user-controlled identifier exploit was demonstrated in those paths. The vulnerable dependency still needs replacement and regression testing.

Upgrade the compatible database/repository dependency set and verify fresh installation, existing-database migrations, sales, returns, supplier payments, and backup restore. Do not delete or rewrite applied migration files as dependency cleanup. [Drizzle advisory](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9).

## Additional findings

- **Critical development-tool advisory:** Vitest **2.1.9** has a UI/API-server arbitrary file read/execution advisory. The reviewed project uses `vitest run` and does not configure that server; this is not evidence of remote execution in the installed POS. Upgrade Vitest and its coverage package together, and keep development servers private. [Advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp).
- **Other development dependencies:** audit findings also cover Vite and transitive build/test packages. Resolve through compatible upgrades and re-audit; avoid a blind forced upgrade of the entire lockfile.
- **Local authentication boundary:** password/PIN checks use salted PBKDF2 and timing-safe comparison. Login throttling is held in memory and resets on application restart. A short PIN and filesystem access are not a strong defense against a malicious local user. Windows account access and disk protection remain essential; app roles do not isolate users who can alter the database files.
- **Backup confidentiality:** SQLite databases and backups contain business information and credential hashes and are not application-encrypted. Restrict access and use protected off-device storage. Verify recovery on a copy before deployment.
- **Update authenticity:** the current installer is unsigned and updates are distributed manually. A checksum detects changes only when obtained through a trusted channel; it does not independently identify the publisher. For this private installation, document a controlled installer handoff and verification process.
- **Defense-in-depth opportunities:** explicitly set renderer sandbox policy, deny unused Electron permission requests, and bind IPC requests to the intended window/main frame as well as the current sender-URL check. These are hardening opportunities, not demonstrated bypasses in this review.
- **Release automation:** functional CI currently does not enforce a dependency security gate. Add a gate that includes the shipped Electron runtime and documents any narrowly justified exceptions. Pin external CI actions to reviewed commit hashes.

## Controls observed

- Renderer context isolation is enabled and Node integration is disabled; preload exposes a fixed application API.
- CSP restricts scripts to the application, blocks network connections and objects, and denies form submission. Navigation and new windows are blocked.
- IPC validates request envelopes and sender URLs, applies channel policies, and checks session/permissions. Setup rejects reconfiguration after installation.
- Main-process operations are serialized; financial operations check counter state. These controls still require transaction regression tests after upgrades.
- Restore uses verification, confirmation, staging, and a recovery snapshot. Diagnostics use structured allowlisted fields and exclude native dumps from ordinary exports.

## Next steps, in order

Local validation for the accompanying POS changes passed: `pnpm check` (lint, typecheck, build, 80 tests across 29 files) and `pnpm test:e2e` (16 Electron journeys). These macOS results do not replace Windows acceptance or close dependency advisories.

1. Resolve the workstation incident and establish a trusted build environment.
2. Upgrade Electron, Drizzle, and vulnerable build/test dependencies in focused changes; re-audit the resulting lockfile.
3. Run unit/integration and Electron journeys, including customer selection, checkout, partial/full returns, stock, supplier payments, and backup/restore.
4. Produce a uniquely versioned Windows candidate and test install/update, scanner, receipt printer, restart, and recovery on the actual counter PC.
5. Create the real store configuration, restrict Windows access, establish off-device backups, and record final acceptance before live trading.

The dependency upgrades, workstation investigation, and target-PC acceptance are **not completed by this review**.
