# Build Strategy

## Development

Local development happens on macOS.

The development loop should eventually run:

- Electron main process in watch mode
- Vite dev server for the React renderer
- TypeScript type checking
- Vitest for unit tests
- Playwright for end-to-end smoke tests

No product build logic is implemented yet.

## GitHub

GitHub Actions should become the source of truth for validation.

Recommended future checks:

- Install with pnpm
- Lint
- Typecheck
- Unit tests
- Playwright smoke tests
- Build desktop app
- Upload artifacts for review

## Windows Build

Production builds should run on Windows CI workers.

Why: the product targets Windows, uses native dependencies such as `better-sqlite3`, and will need
installer validation in the target environment.

## Installer

Use Electron Builder with an NSIS installer.

The installer must:

- Require no technical knowledge
- Install cleanly for non-developer users
- Bundle all required runtime assets
- Work without internet access after installation
- Support future upgrades and database migrations

Current commands:

```sh
pnpm pack:win
pnpm dist:win
```

Upgrade rule: customer data must live in Electron's `userData` folder, not in the installation
directory. Running a newer installer replaces application files, keeps
`orix-retail-os.sqlite`, and runs pending migrations on startup.
