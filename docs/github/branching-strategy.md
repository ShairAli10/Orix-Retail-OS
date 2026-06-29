# Branching Strategy

## Recommendation

Use:

- `main`
- `develop`
- `feature/*`
- `release/*`
- `hotfix/*`

## Why

`main` represents production-ready code. It should always be releasable.

`develop` is the integration branch for the next release train. It gives the team a stable place to
combine completed work before a release branch is cut.

`feature/*` branches isolate individual changes and make reviews smaller.

`release/*` branches allow stabilization without blocking future development.

`hotfix/*` branches allow urgent production fixes to start from `main` and then merge back into
both `main` and `develop`.

This model is intentionally conservative. For a retail desktop system, release stability and
supportability matter more than maximum branch simplicity.
