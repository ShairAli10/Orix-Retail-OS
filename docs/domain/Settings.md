# Settings Domain

This document covers Users, Roles & Permissions, and Settings.

## Users

### Purpose

Users represent people who operate the system and perform auditable business actions.

### Responsibilities

Owns:

- User identity inside the application
- User display name
- User active status
- User role assignment
- User audit identity

Never owns:

- Business permissions directly outside assigned roles
- Customer identity
- Supplier identity
- Ledger balances
- Product ownership

### Lifecycle

Possible states:

- Invited
- Active
- Suspended
- Archived

Allowed transitions:

```text
Invited -> Active
Active -> Suspended
Suspended -> Active
Active -> Archived
Suspended -> Archived
```

### Business Rules

- At least one Owner or Admin user must exist.
- Active users must have at least one role.
- Suspended users cannot perform business actions.
- Archived users remain visible in audit history.
- User identity changes must be audit logged.
- Password, PIN, or authentication design is outside this blueprint and should be decided during
  authentication implementation.

### Relationships

- Users are assigned roles.
- Users perform auditable actions.
- Users may be associated with sales, payments, adjustments, reports, and settings changes.

### Events Produced

- User Created
- User Activated
- User Suspended
- User Reactivated
- User Archived
- User Role Changed

### Events Consumed

- Role Archived
- Permission Updated

### Permissions

- View: Owner, Admin, Manager for limited staff visibility
- Create: Owner, Admin
- Edit: Owner, Admin
- Delete: Not allowed after audit history exists
- Approve: Owner, Admin
- Cancel: Owner, Admin

### Dashboard Metrics

- Active users
- Suspended users
- Sales by user
- Recent administrative activity

### Future Features

- PIN login
- Shift assignment
- User-specific cash drawers
- Time clock
- Biometric login

## Roles & Permissions

### Purpose

Roles and Permissions define what users are allowed to do in the system.

### Responsibilities

Owns:

- Role names
- Permission assignments
- Permission policy meaning
- Administrative access boundaries

Never owns:

- User identity details
- Business workflow state
- Ledger or inventory calculations
- UI visibility as the only security mechanism

### Lifecycle

Possible states:

- Draft
- Active
- Archived

Allowed transitions:

```text
Draft -> Active
Active -> Archived
Archived -> Active
```

### Business Rules

- Owner permissions cannot be fully removed from the last owner/admin equivalent.
- Permission checks must be enforced in application behavior, not only hidden in the UI.
- Default roles should include Owner, Admin, Manager, and Cashier.
- Role changes must be audit logged.
- Archived roles cannot be assigned to active users.
- Built-in roles may be protected from deletion.

### Relationships

- Users receive permissions through roles.
- Every domain defines expected permission capabilities.
- Audit logs record role and permission changes.

### Events Produced

- Role Created
- Role Updated
- Role Archived
- Permission Granted
- Permission Revoked

### Events Consumed

- User Created
- User Role Changed

### Permissions

- View: Owner, Admin
- Create: Owner, Admin
- Edit: Owner, Admin
- Delete: Owner, only when unused and not protected
- Approve: Owner
- Cancel: Owner, Admin

### Dashboard Metrics

- Users by role
- Permission changes
- Administrative changes

### Future Features

- Custom permission groups
- Approval thresholds by role
- Temporary permissions
- Role templates by store type

## Settings

### Purpose

Settings define store-level business behavior and application preferences.

### Responsibilities

Owns:

- Business behavior configuration
- Default cash account selection
- Negative inventory setting
- Receipt preferences
- Expense categories
- Report defaults
- Backup preferences

Never owns:

- Historical business truth
- Direct ledger adjustments
- Direct inventory adjustments
- User permissions except through the roles domain

### Lifecycle

Possible states:

- Default
- Configured
- Locked
- Archived Setting Version

Allowed transitions:

```text
Default -> Configured
Configured -> Locked
Locked -> Configured
Configured -> Archived Setting Version
```

### Business Rules

- Settings changes that affect business outcomes must be audit logged.
- Negative inventory is disabled by default.
- Changing negative inventory behavior requires Owner or Admin approval.
- Settings must not silently rewrite historical records.
- Settings must be backed up and restored with store data.
- Some settings may become locked after transactions exist.
- Defaults must support offline operation.

### Relationships

- Store uses settings for operational behavior.
- Sales, purchases, inventory, reports, payments, and backup consume settings.
- Audit logs track sensitive setting changes.

### Events Produced

- Settings Updated
- Negative Inventory Setting Changed
- Receipt Settings Updated
- Backup Settings Updated

### Events Consumed

- Store Activated
- Backup Restored

### Permissions

- View: Owner, Admin, Manager
- Create: System-controlled defaults
- Edit: Owner, Admin
- Delete: Not applicable
- Approve: Owner, Admin, for sensitive settings
- Cancel: Owner, Admin

### Dashboard Metrics

- Backup status
- Negative inventory enabled indicator
- Configuration completeness

### Future Features

- Tax configuration
- Multi-store settings profiles
- Advanced approval workflows
- Localization settings
- Cloud sync preferences
