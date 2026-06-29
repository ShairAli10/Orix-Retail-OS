# Development Tooling

## ESLint

ESLint is used for static analysis, including TypeScript-aware rules. It should block unsafe
patterns such as `any`, unused code, and inconsistent type imports.

Why: strict linting protects architecture by catching low-level drift before review.

## Prettier

Prettier is used for formatting only.

Why: formatting should not be a topic of code review. A single formatter keeps diffs small and
consistent.

## EditorConfig

EditorConfig defines baseline editor behavior such as UTF-8, LF endings, two-space indentation, and
final newlines.

Why: contributors may use different editors, but files should remain consistent.

## GitIgnore

`.gitignore` excludes generated artifacts, local environment files, build output, coverage, and
platform noise.

Why: the repository should contain source, configuration, and documentation, not machine-local
artifacts.

## Husky

Husky is recommended for lightweight local Git hooks.

Why: local checks catch obvious problems before they reach CI. Hooks should remain fast and should
not replace CI.

## lint-staged

lint-staged runs targeted formatting and linting on changed files.

Why: developers get fast feedback without waiting for a full repository check on every commit.

## Commitlint

Commitlint with Conventional Commits is recommended.

Why: disciplined commit messages make release notes, changelogs, and versioning automation easier
when the project reaches production maturity.
