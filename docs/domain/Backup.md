# Backup & Restore Domain

## Purpose

Backup & Restore protects the local offline business data of Orix Retail OS and allows recovery from
device failure, corruption, or user mistakes.

## Responsibilities

Owns:

- Backup creation policy
- Backup validation
- Restore workflow meaning
- Backup metadata
- Recovery confidence indicators

Never owns:

- Business data definitions
- Ledger calculation rules
- Inventory calculation rules
- Authentication policy
- Operating system installer behavior

## Lifecycle

Backup states:

- Requested
- Created
- Verified
- Failed
- Archived

Restore states:

- Selected
- Validated
- Restored
- Failed
- Cancelled

Allowed transitions:

```text
Requested -> Created -> Verified
Requested -> Failed
Verified -> Archived
Selected -> Validated -> Restored
Selected -> Cancelled
Validated -> Failed
```

## Business Rules

- Backup must work without internet access.
- Backup files should include all data required to restore the store.
- Backup creation must not corrupt active business data.
- Backups should be verified after creation where possible.
- Restore must warn that current data may be replaced.
- Restore must be restricted to Owner or Admin.
- Restore must create audit history after successful completion.
- Backup metadata should include store identity, creation time, application version, and validation
  status.
- Automatic backup reminders are recommended for Version 1.0.
- Cloud backup is excluded from Version 1.0 unless separately approved.

## Relationships

- Backup includes store data, settings, users, products, transactions, ledger, reports source data,
  and audit logs.
- Restore affects every domain because it replaces or recovers local business history.
- Audit logs record backup and restore activity.
- Reports may show backup status.

## Events Produced

- Backup Requested
- Backup Created
- Backup Verified
- Backup Failed
- Restore Started
- Backup Restored
- Restore Failed
- Restore Cancelled

## Events Consumed

- Settings Updated
- Store Activated
- Application Version Upgraded

## Permissions

- View: Owner, Admin
- Create: Owner, Admin
- Edit: Owner, Admin, for backup settings
- Delete: Owner, Admin, for application-managed backup records where applicable
- Approve: Owner, Admin, for restore
- Cancel: Owner, Admin, during restore preparation

## Dashboard Metrics

- Last backup time
- Backup health
- Failed backup count
- Restore history
- Backup storage warning

## Future Features

- Encrypted backups
- Scheduled automatic backups
- Cloud backup
- External drive detection
- Backup retention policies
- One-click support recovery package
