# Orix Retail OS

Offline-first desktop Retail Management System for Windows, developed on macOS by Orix Tech.

This repository contains the working offline-first desktop application foundation and active retail
modules for products, inventory, customers, suppliers, purchases, POS, reports, backup/restore,
returns, stock take, and Windows packaging.

## Foundation

- Electron desktop shell under `apps/desktop`
- React, TypeScript, and Vite renderer
- SQLite, better-sqlite3, and Drizzle ORM local persistence
- Layered architecture enforced through package boundaries
- pnpm workspace with TypeScript project references

## Local Prerequisite

Use a current Node.js 22 LTS patch (minimum 22.14; `nvm install && nvm use` on macOS). Node 20 is no longer supported by the desktop build tooling. Enable pnpm before running workspace commands:

```sh
corepack enable
corepack prepare pnpm@10.0.0 --activate
```

## Useful Commands

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm check
pnpm desktop:smoke
pnpm pack:win
pnpm dist:win
```

`pnpm dist:win` creates the Windows installer in `release/windows/`. Customer data is stored under
Electron `userData`, so installing a newer version updates the app without replacing the SQLite
database.
