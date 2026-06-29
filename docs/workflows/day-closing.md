# Day Closing Workflow

## Purpose

Closes a business day, summarizes activity, and supports cash reconciliation and management review.

## Trigger

An authorized user closes the active business day at end of trading.

## Preconditions

- Business day is open.
- User can close day.
- Critical drafts or in-progress postings are resolved.
- Cash account or drawer totals can be reviewed.
- Backup reminder status is visible.

## Happy Path

1. User starts day closing.
2. System summarizes sales, returns, payments, expenses, purchases, cash movement, and adjustments.
3. User enters counted cash where required.
4. System calculates cash variance.
5. Authorized user reviews variance and closing summary.
6. Day is closed.
7. Cash drawer is closed where used.
8. Dashboard moves to closed-day status.
9. Audit log records closing.

## Business Rules

- Closed business days should not accept new normal transactions.
- Closing does not edit source transactions.
- Cash variance must be visible and auditable.
- Significant variance requires Manager/Admin/Owner approval.
- Day cannot close while critical posting workflows are incomplete.
- Reports derive from source transactions, not the closing summary alone.

## Failure Scenarios

- Open drafts exist: warn and require resolution or authorized close.
- Cash variance exceeds threshold: require approval or block.
- Printer unavailable for closing report: close day if approved, mark report unprinted.
- Power loss before closing: day remains open.
- Power loss after closing: day remains closed; recovery must not create duplicate closing.
- Database lock: keep day open and allow retry.

## Business Events Produced

- DayClosed
- CashDrawerClosed
- DashboardMetricsUpdated
- AuditLogCreated

## Audit Requirements

Log user, business day, closing time, expected cash, counted cash, variance, approvals, unresolved
warnings, and closing report print status.

## Reporting Impact

Produces daily closing summary and updates daily sales, cash, payments, expenses, returns, purchases,
stock adjustments, and variance reports.

## Future Enhancements

- Register-level closing
- Shift-level closing
- Mandatory backup after close
- Manager sign-off printout
- Mobile owner approval
