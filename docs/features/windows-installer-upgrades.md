# Windows Installer and Upgrade Path

Orix Retail OS uses Electron Builder to create a standard Windows NSIS installer.

## Build Commands

From the repository root:

```sh
pnpm pack:win
```

Creates an unpacked Windows application at:

```text
release/windows/win-unpacked/
```

```sh
pnpm dist:win
```

Creates the customer installer at:

```text
release/windows/Orix-Retail-OS-Setup-<version>-x64.exe
```

## Upgrade Behavior

The installer is designed so a newer installer updates the existing Windows installation in place.

The upgrade identity is controlled by:

- Stable `appId`: `tech.orix.retailos`
- Stable product name: `Orix Retail OS`
- Stable executable name: `Orix Retail OS.exe`
- NSIS installer target
- App data deletion disabled on uninstall

When a customer runs a newer installer:

1. Windows keeps the existing per-user app data folder.
2. The installer replaces application binaries.
3. The application starts from the same SQLite database path.
4. Pending database migrations run on startup.
5. Customer store data remains in place.

## Data Preservation Policy

The customer database is stored in Electron's user data directory:

```text
%APPDATA%/Orix Retail OS/orix-retail-os.sqlite
```

The installer installs application files under the normal Windows app install location. It must
never store customer data inside the install directory because installers are allowed to replace
that directory during upgrades.

The NSIS configuration sets:

```yaml
deleteAppDataOnUninstall: false
```

This protects customer data even if the app is uninstalled. A future support tool may add a
separate explicit "delete all local data" action, but the installer must not do that silently.

## Migration Resources

Packaged builds copy database migrations into:

```text
resources/migrations/
```

At runtime, Orix Retail OS checks the packaged resources path first and then falls back to
repository paths for development. This allows fresh installs and upgrades to run migrations without
developer files.

## Native SQLite Packaging

`better-sqlite3` is a native dependency. Electron Builder rebuilds it for the target Electron
runtime and unpacks its `.node` binary outside `app.asar`.

The unpacked binary is expected under:

```text
resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

## Required Windows QA

Before beta release, run this on a clean Windows laptop:

1. Install Version A.
2. Complete first-run setup.
3. Add products, customers, inventory, and at least one sale.
4. Close the app.
5. Install Version B over the existing installation.
6. Open the app.
7. Confirm the store, users, products, inventory, sales, customers, and settings still exist.
8. Confirm migrations have completed.
9. Confirm backup and restore still work.
10. Confirm uninstall does not silently delete the SQLite database.

## Current Limitations

- The installer is unsigned, so Windows SmartScreen may warn until code signing is added.
- Automated update delivery is not implemented yet; the customer runs the newer installer manually.
- Full upgrade validation still needs a real Windows machine because this repository is developed on macOS.
