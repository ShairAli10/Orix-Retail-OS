# Backup & Restore

Backup and restore protects offline customer installations from data loss before imports,
upgrades, hardware failure, or accidental damage.

## Current Implementation

- Backups are created from the active SQLite database using the SQLite backup API.
- The application checkpoints WAL before backup creation.
- Each backup receives a human-readable backup number and timestamped file name.
- Backup files are written to the configured backup folder, or to a default Orix folder in the
  user's Documents directory.
- Each backup stores metadata in the `backups` table:
  - status
  - backup number
  - file name
  - file size
  - checksum
  - started, completed, and verified timestamps
  - user attribution
- Backup files are verified with SQLite `integrity_check` before being marked as protected.
- Restore requires explicit confirmation by typing `RESTORE`.
- Restore creates a safety backup of the current database before replacing it.
- After restore, the desktop app schedules a restart so the database connection is rebuilt.

## Import Safety

Legacy stock import requires a completed backup before data is imported. This prevents an owner
from losing the current database state during onboarding or migration.

## UI Behavior

Settings includes a Backup panel for:

- choosing the backup folder
- creating a backup immediately
- viewing recent backups
- selecting a backup file
- verifying a backup file
- restoring a backup file

The restore section is visually separated as a destructive action.

## Known Limitations

- Backup file paths are not persisted in the `backups` table because the approved schema only
  stores file names. The UI reconstructs recent file paths from the current backup folder.
- Automatic scheduled backups are not implemented yet.
- Off-device backup reminders are not implemented yet.
- Restore history is recorded before replacement; future schema work should preserve restore audit
  metadata inside the restored database as well.

## Future Enhancements

- Daily automatic backup scheduler.
- Backup retention rules.
- External drive detection.
- Cloud backup adapter.
- Encrypted backup option.
- Restore preview showing store name, backup date, and record counts before confirmation.
