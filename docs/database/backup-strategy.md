# Backup Strategy

Backups are a business feature, not just a technical operation.

## Goals

- Work fully offline.
- Protect all local business data.
- Be understandable to non-technical retailers.
- Be restorable after failure.
- Support future encrypted and scheduled backups.

## Backup Scope

A valid backup must include:

- SQLite database file and related WAL state captured safely.
- Store identity.
- Users, roles, permissions.
- Products, customers, suppliers.
- Sales, purchases, payments, expenses.
- Inventory transactions.
- Ledger transactions and entries.
- Audit logs.
- Settings.
- Business events.
- Backup metadata needed for restore validation.

## Backup Method

Use SQLite's online backup API or an equivalent safe backup mechanism through the selected SQLite
library.

Do not copy the database file directly while writes may be active unless using a verified SQLite-safe
procedure that also accounts for WAL files.

## Backup Workflow

1. Validate destination.
2. Record BackupStarted.
3. Use a SQLite-safe backup process.
4. Compute checksum where feasible.
5. Validate backup can be opened.
6. Record BackupCompleted or BackupFailed.
7. Update backup dashboard status.
8. Audit the result.

## Restore Workflow

1. Validate backup metadata.
2. Confirm application version compatibility.
3. Block business workflows.
4. Warn user about replacement.
5. Restore backup.
6. Validate restored database.
7. Record RestoreCompleted or RestoreFailed.
8. Audit the result.

## Backup Metadata

The `backups` table stores:

- backup number
- status
- destination type
- file name
- file size
- checksum
- app version
- start time
- completion time
- verification time
- failure reason

It does not store the backup file itself.

## WAL Considerations

When WAL mode is enabled, backup must use a SQLite-safe API. Direct file copy can miss committed
transactions still represented through WAL state.

## Retention Policy

Version 1.0 should recommend a simple manual retention policy:

- Keep latest daily backup.
- Keep several recent backups before upgrades.
- Warn when no recent verified backup exists.

Automatic retention cleanup is future work.

## Failure Handling

- Partial backups are invalid.
- Failed verification marks backup failed.
- Backup failure must be visible to the user.
- Backup failure must not corrupt live data.
- Restore failure must leave the application in a recoverable state or support-guided recovery mode.

## Future Enhancements

- Encrypted backup files.
- Scheduled backups.
- External drive prompts.
- Cloud backup.
- Support diagnostic backup bundles.
- Restore preview.
