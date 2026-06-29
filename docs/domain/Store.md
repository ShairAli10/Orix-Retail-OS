# Store Domain

## Purpose

The Store domain defines the identity and operating context of the retail business using Orix
Retail OS.

It answers: which business is this installation running for, what are its operating details, and
which settings describe the store as a legal and commercial entity?

## Responsibilities

Owns:

- Store name and trading identity
- Store contact details
- Store address
- Tax or registration identifiers where applicable
- Default currency display context
- Receipt header/footer business identity
- Store active or inactive status

Never owns:

- User authentication
- Role permissions
- Product catalog rules
- Ledger posting rules
- Backup files
- Report calculations

## Lifecycle

Possible states:

- Draft
- Active
- Suspended
- Archived

Allowed transitions:

```text
Draft -> Active
Active -> Suspended
Suspended -> Active
Active -> Archived
Suspended -> Archived
```

Archived stores cannot be used for new business activity.

## Business Rules

- A production installation must have exactly one active primary store in Version 1.0.
- Store identity must be configured before sales, purchases, payments, or reports are used.
- Store name is required before activation.
- Store contact information should be printable on receipts and reports.
- Store registration identifiers are optional unless required by local configuration.
- Archived store records remain visible for historical reports.
- Store identity changes after business activity begins must be audit logged.
- Store currency context must not be changed after financial transactions exist unless a formal
  migration process is approved.

## Relationships

- Users operate inside the store context.
- Settings define store-level behavior.
- Sales, purchases, payments, expenses, ledger entries, and reports belong to the active store.
- Backup and restore protect the store's local business data.

## Events Produced

- Store Created
- Store Activated
- Store Updated
- Store Suspended
- Store Archived

## Events Consumed

- Backup Restored
- Settings Updated

## Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin
- Edit: Owner, Admin
- Delete: Not allowed after activation
- Approve: Owner
- Cancel: Owner, Admin

## Dashboard Metrics

- Store status
- Current business date
- Active users
- Last backup time
- Current cash in hand

## Future Features

- Multi-branch operations
- Warehouse-linked stores
- Tax-region-specific store profiles
- Store-specific price books
- Cloud synchronization between branches
