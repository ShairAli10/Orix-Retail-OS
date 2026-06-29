# User Management Workflow

## Purpose

Creates and maintains local users, role assignment, suspension, and audit identity.

## Trigger

Owner or Admin creates, edits, suspends, reactivates, archives, or changes roles for a user.

## Preconditions

- Store is initialized.
- Acting user can manage users.
- At least one Owner/Admin equivalent remains active.
- Target role exists and is active.
- User identity fields are valid.

## Happy Path

1. Acting user selects user management action.
2. System validates permission and last-admin protection.
3. User details or role assignments are entered.
4. System validates required fields and active roles.
5. Change is saved.
6. Audit log records the administrative action.
7. Dashboard and user lists update.

## Business Rules

- At least one Owner/Admin equivalent must remain active.
- Suspended users cannot perform business actions.
- Archived users remain in audit history.
- Role changes must be auditable.
- Permission enforcement must happen in business behavior, not only UI visibility.
- Authentication mechanics are defined later; audit identity is required now as business concept.

## Failure Scenarios

- Last admin would be removed: block and explain.
- Role is archived: block assignment.
- Duplicate username or identifier: block and show conflict.
- User has audit history: archive rather than delete.
- Power loss before save: no change.
- Power loss after save: change remains; recovery must not duplicate audit.
- Database lock: do not save; allow retry.

## Business Events Produced

- UserCreated
- UserUpdated
- UserSuspended
- UserReactivated
- UserArchived
- UserRoleChanged
- AuditLogCreated
- DashboardMetricsUpdated

## Audit Requirements

Log acting user, target user, action, role changes, status changes, timestamp, business day where
applicable, and reason for suspension or archival.

## Reporting Impact

Updates active users, suspended users, recent administrative activity, sales by user continuity, and
audit reports.

## Future Enhancements

- PIN login
- Biometric login
- Shift assignments
- Temporary permissions
- Mobile user invitations
