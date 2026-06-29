# Workspace and TypeScript Strategy

## pnpm Workspace

Use pnpm workspaces for deterministic dependency installation, fast linking, and clear package
ownership. pnpm's strict node_modules layout helps catch undeclared dependencies early, which is
valuable in a long-lived commercial codebase.

## TypeScript Project References

Use TypeScript project references from the repository root. Each package has its own `tsconfig.json`
with `composite: true` inherited from `tsconfig.base.json`.

Benefits:

- Type checking follows package boundaries
- Incremental builds remain fast as the codebase grows
- Circular package dependencies are easier to detect
- Editors can navigate and validate each package independently

## Shared tsconfig Strategy

The root `tsconfig.base.json` defines strictness once:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noUnusedLocals`
- `noUnusedParameters`

Packages extend the base and only override package-specific details such as JSX mode, root
directory, and output directory.
