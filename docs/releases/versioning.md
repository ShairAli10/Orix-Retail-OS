# Versioning Strategy

## Semantic Versioning

Use Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

- MAJOR: incompatible changes, migration risk, or major commercial release line
- MINOR: backward-compatible feature additions
- PATCH: bug fixes, security fixes, and low-risk maintenance

## Release Workflow

1. Merge completed work into `develop`.
2. Cut a `release/x.y.0` branch.
3. Stabilize with bug fixes only.
4. Build and test Windows installer artifacts.
5. Tag the release from `main`.
6. Publish release notes and installer artifact.
7. Merge release fixes back into `develop`.

Before version `1.0.0`, breaking changes are allowed but must still be documented. After `1.0.0`,
database migrations and customer upgrade paths become part of release acceptance.
