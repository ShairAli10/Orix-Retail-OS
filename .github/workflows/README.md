# Desktop quality checks

`quality.yml` runs lint, type checks, real SQLite tests, seeded Electron checkout tests, and an
unpacked Windows build for pull requests and pushes to main. Failed UI evidence is retained
as a workflow artifact. The workflow has not yet run on GitHub for these local changes.

Local equivalents: `pnpm check`, `pnpm test:e2e`, and (on Windows) `pnpm pack:win`.
Hardware and clean-machine installer acceptance remain manual release gates.
