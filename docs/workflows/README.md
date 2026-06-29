# Workflow Blueprint

This directory defines business workflows that will later become application services.

The documents are not UI specifications, database schemas, API contracts, or TypeScript designs.
They define business flow, validation, processing, events, audit, reporting impact, rollback, and
failure handling.

## Workflow Pattern

Every workflow follows this pattern:

```text
Business Trigger
  -> Validation
  -> Business Processing
  -> Business Events
  -> Audit Logging
  -> Dashboard Updates
  -> Notifications (future)
  -> Completion
```

## Workflows

- [Cash Sale](./cash-sale.md)
- [Credit Sale](./credit-sale.md)
- [Purchase](./purchase.md)
- [Purchase Return](./purchase-return.md)
- [Sales Return](./sales-return.md)
- [Supplier Payment](./supplier-payment.md)
- [Customer Payment](./customer-payment.md)
- [Expense](./expense.md)
- [Stock Adjustment](./stock-adjustment.md)
- [Stock Take](./stock-take.md)
- [Opening Stock](./opening-stock.md)
- [Opening Balance](./opening-balance.md)
- [Backup](./backup.md)
- [Restore](./restore.md)
- [Day Opening](./day-opening.md)
- [Day Closing](./day-closing.md)
- [User Management](./user-management.md)
- [Settings](./settings.md)

## Rollback Principle

If a workflow fails before posting business facts, it should leave no business effect. If it fails
after posting immutable facts, correction must happen through a compensating workflow such as
return, reversal, or adjustment.

## Notification Principle

Version 1.0 notifications are local in-app warnings or dashboard indicators. SMS, WhatsApp, email,
push notifications, and cloud alerts are future features.
