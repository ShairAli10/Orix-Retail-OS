# Settings Workflow

## Purpose

Controls store-level behavior such as negative inventory, receipt preferences, expense categories,
backup preferences, report defaults, and operational policies.

## Trigger

Owner or Admin changes a setting.

## Preconditions

- Store is initialized.
- Acting user can edit settings.
- Setting is editable in current business state.
- Sensitive setting changes have approval where required.

## Happy Path

1. User opens settings and selects configuration area.
2. System shows current setting and business impact.
3. User changes value.
4. System validates whether setting can change after existing transactions.
5. Sensitive changes require approval.
6. Setting is saved as new configuration state.
7. Audit log records change.
8. Dashboards or warnings update where affected.

## Business Rules

- Settings must not rewrite historical records.
- Negative inventory is disabled by default.
- Changing negative inventory requires Owner/Admin approval.
- Receipt and backup settings affect future behavior only.
- Settings affecting business outcomes must be auditable.
- Some settings become locked after transactions exist.
- Offline operation cannot be disabled by settings.

## Failure Scenarios

- Setting locked by transaction history: block and explain why.
- Approval denied: no change.
- Invalid value: keep previous setting and show validation message.
- Power loss before save: previous setting remains.
- Power loss after save: new setting remains; recovery must not duplicate audit.
- Database lock: do not save; allow retry.

## Business Events Produced

- SettingsUpdated
- NegativeInventorySettingChanged
- ReceiptSettingsUpdated
- BackupSettingsUpdated
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log setting key, old value, new value, acting user, approval user where required, timestamp, reason
where required, and affected business area.

## Reporting Impact

Updates configuration completeness, backup status, negative inventory indicator, and audit reports.

## Future Enhancements

- Tax settings
- Localization
- Multi-branch policies
- Cloud sync settings
- Approval workflow configuration
