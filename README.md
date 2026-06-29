# Orix Retail OS

Offline-first desktop Retail Management System for Windows, developed on macOS by Orix Tech.

This repository currently contains the project foundation only. Product modules such as POS,
inventory, ledger, reports, authentication, and database schema are intentionally not implemented
yet.

## Foundation

- Electron desktop shell planned under `apps/desktop`
- React, TypeScript, Vite, Tailwind CSS, and shadcn/ui planned for the renderer
- SQLite, better-sqlite3, and Drizzle ORM planned for local persistence
- Layered architecture enforced through package boundaries
- pnpm workspace with TypeScript project references

## Local Prerequisite

Enable pnpm before running workspace commands:

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
```
