# Architecture Guide

## Runtime Flow

```text
Renderer React
  -> Electron IPC
  -> Application Services
  -> Repositories
  -> SQLite
```

## Layer Rules

React components render UI and collect user intent. They do not decide business outcomes.

IPC clients and handlers transport typed requests and responses. They do not contain business
rules.

Application services coordinate use cases and enforce business rules.

Repositories persist and retrieve data. They do not decide whether a workflow is allowed.

SQLite is the local durable store and must support offline operation.

## Dependency Rules

- `apps/desktop` may compose packages.
- `packages/ui` may depend on shared primitives.
- `packages/business` may depend on shared primitives and repository contracts.
- `packages/database` may depend on shared primitives and database libraries.
- Product packages should expose cohesive domain APIs.
- No package should depend on `apps/desktop`.

## Architecture Smells

- A React component imports a repository.
- A repository checks workflow permissions.
- IPC handlers contain branching business rules.
- Shared contains feature-specific policy.
- Database migrations are coupled to UI code.
