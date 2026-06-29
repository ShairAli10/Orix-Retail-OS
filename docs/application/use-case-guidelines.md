# Use Case Guidelines

## Responsibilities

Application use cases may:

- Validate input shape
- Call authorization hooks
- Open transaction boundaries
- Coordinate repositories
- Collect events
- Publish events after successful commit
- Return typed results

## Anti-Patterns

Application use cases must not contain:

- Product pricing rules
- Stock calculation rules
- Ledger posting rules
- Permission implementation details
- UI formatting
- IPC handling
- Receipt printing
- Barcode scanning
- Hardware integration

## Operation Injection

RFC-009 use cases are implemented as orchestration factories. The workflow operation is injected so
future domain-specific implementations can be added without changing the transaction, validation,
authorization, or event-publication pipeline.

This keeps the application layer stable while the domain layer matures.

## Result Handling

Use cases return `Result<T, E>`.

Failures are values, not thrown exceptions for normal business flow. Unexpected infrastructure
exceptions should be converted into typed errors by the boundary that catches them.
