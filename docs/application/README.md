# Application Layer

The application layer orchestrates Orix Retail OS use cases.

It coordinates:

- Request validation
- Authorization policies
- Transaction boundaries
- Repository calls
- Event collection
- Event publication after commit

It does not own domain business rules. It asks domain logic and repositories to do their specific
jobs, then controls the workflow boundary around them.

## Package

`@orix/application`

## Request Lifecycle

1. Receive a typed input DTO.
2. Validate request shape.
3. Run authorization policy.
4. Start application transaction boundary.
5. Coordinate repository/domain operation.
6. Collect events during execution.
7. Roll back if the operation fails.
8. Commit if the operation succeeds.
9. Publish collected events only after commit.
10. Return `Result<T, E>`.
