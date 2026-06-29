# Transaction Boundaries

Application services own transaction boundaries.

Repositories never begin, commit, or roll back transactions. They use the connection they are given.

## Successful Request

```text
Validate request
Authorize request
Begin transaction
Run operation
Collect events
Commit transaction
Publish events
Return success
```

## Failed Request

```text
Validate request
Authorize request
Begin transaction
Run operation
Rollback transaction
Do not publish events
Return failure
```

## Validation or Authorization Failure

Validation and authorization happen before the transaction boundary.

If either fails, no transaction starts and no events are published.

## Event Publication

Events are collected during the transaction but published only after commit.

This prevents downstream handlers from observing a business event for data that later rolls back.
