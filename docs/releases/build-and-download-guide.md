# Build and download Orix Retail for Windows

## Download the current installer

Version: **1.0.0**, built from application commit `75912af7bb690add5418ab945272417d1f2fdb03`.

- [Download the Windows installer directly — no login required](https://github.com/ShairAli10/Orix-Retail-OS/releases/download/v1.0.0/Orix-Retail-OS-Setup-1.0.0-x64.exe)
- [Release page and checksums](https://github.com/ShairAli10/Orix-Retail-OS/releases/tag/v1.0.0)
- [Open its successful build](https://github.com/ShairAli10/Orix-Retail-OS/actions/runs/36997600684)

The public release link downloads the EXE directly. Open the downloaded file to install. Actions artifact links still require GitHub login; share the Release asset link instead.

This stable 1.0.0 release promotes the owner-tested rc.6 application with a version-only change. The owner confirmed successful Windows laptop acceptance of the core store workflows. Its Windows workflow passed the dependency audit, code checks, automated tests, Electron journeys, and packaged SQLite startup check.

## Create the next build — recommended, including from a Mac

1. Change `version` in `apps/desktop/package.json` to a new version, for example `1.0.1` for a maintenance release. Keep each distributed build's version unique.
2. Commit and push the intended changes to `main`. Normal pushes start the Windows workflow automatically. A documentation-only commit marked `[skip ci]` does not.
3. Open [GitHub → Actions → Desktop quality](https://github.com/ShairAli10/Orix-Retail-OS/actions/workflows/quality.yml).
4. Open the run for your commit. Wait for a green **success** result. The workflow installs dependencies, audits security, runs tests, builds the Windows installer, and checks packaged-app startup.
5. Scroll to **Artifacts** at the bottom of the run. Click **windows-installer-…**. Do not send `windows-support-and-symbols-…` or `windows-check-evidence` to the store as the installer.
6. Copy the installer artifact's link to share with someone who has repository access. Download and extract the ZIP to send just the EXE through your chosen private sharing service.

To rebuild an existing commit on main: open the same workflow page, choose **Run workflow**, select **main**, then click **Run workflow**. A newer version number is needed when distributing changed application code, not merely retrying an identical failed build.

## Build locally on Windows

Install a current **Node.js 22 LTS** patch (minimum 22.14), then run these commands in the repository root:

```sh
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
pnpm audit:security
pnpm check
pnpm test:e2e
pnpm dist:win
```

The installer is under `release/windows/`, named `Orix-Retail-OS-Setup-<version>-x64.exe`. This folder is ignored by Git; building locally does not upload the installer to GitHub. The workflow additionally creates the checksum and build-record files. Use GitHub's Windows runner when developing on macOS; it performs the Windows verification too.

The icon is already included. Only when changing its artwork, edit `apps/desktop/build/icon.svg`, run `pnpm build:icons`, and commit the exported assets before building.

## Installing an update at the store

1. Finish active transactions and create a backup; keep an off-device copy.
2. Close Orix, run the new installer, and reopen the app.
3. Check the version, recent sales, stock, and balances before continuing trade.

The installer preserves the existing data directory. Do not delete the database, uninstall to reset data, or install an older executable after a schema upgrade without the documented recovery procedure. Hardware and backup/update acceptance on the real counter PC remain necessary.

## Sharing without GitHub access

The repository is public. Publish each verified installer as an asset on a GitHub Release, tagged with its version and targeting the exact tested application commit. Upload the EXE, SHA256SUMS.txt and build-record.json from the successful workflow artifact. Share the EXE asset link from the Release page; no GitHub login is required. Release candidates should be marked as prereleases.
