# Sales Domain

This document covers Sales and Sale Items.

## Sales

### Purpose

Sales represent goods or services sold to customers and the resulting cash or receivable effect.

### Responsibilities

Owns:

- Sale document identity
- Customer selection when applicable
- Sale date
- Sale status
- Sale totals
- Payment status
- Cancellation reason
- Receipt business meaning

Never owns:

- Customer master data
- Product master data
- Direct stock balance edits
- Cash account balance calculations
- Supplier payables

### Lifecycle

Possible states:

- Draft
- Completed
- Partially Paid
- Paid
- Cancelled
- Returned

Allowed transitions:

```text
Draft -> Completed
Completed -> Partially Paid
Partially Paid -> Paid
Completed -> Paid
Draft -> Cancelled
Completed -> Returned
```

Completed sales cannot be edited directly. Corrections require cancellation, return, or adjustment
workflow.

### Business Rules

- A sale must have at least one sale item before completion.
- Sale item quantities must be greater than zero.
- Sale item prices cannot be negative.
- Products cannot be sold if archived.
- Stock-tracked products cannot be sold below available stock unless negative inventory is enabled.
- Negative inventory is disabled by default.
- Completing a sale decreases inventory for stock-tracked products.
- Completing a credit sale increases customer receivable balance through ledger-impacting records.
- Completing a cash sale increases the selected cash account through ledger-impacting records.
- Paid amount cannot exceed sale total unless overpayment handling is explicitly supported.
- Cancelled draft sales have no inventory or ledger effect.
- Completed sales must produce audit history.
- Customer balance is calculated from sales, returns, customer payments, and ledger entries.

### Relationships

- Sales may be linked to customers.
- Sale items identify products and quantities sold.
- Completed sales produce inventory transactions for stock-tracked products.
- Sales increase revenue and may increase cash or receivables.
- Customer payments reduce receivables.
- Ledger records the financial effect of sales and payments.
- Reports use sales for revenue, margin, tax, product movement, and customer activity.

### Events Produced

- Sale Drafted
- Sale Completed
- Sale Partially Paid
- Sale Paid
- Sale Cancelled
- Sale Returned

### Events Consumed

- Customer Put On Hold
- Product Archived
- Customer Payment Recorded
- Inventory Transaction Posted

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager, Cashier
- Edit: Owner, Admin, Manager, Cashier, while draft
- Delete: Owner, Admin, only while draft
- Approve: Owner, Admin, for discounts, credit overrides, negative stock overrides, or returns
- Cancel: Owner, Admin, Manager

### Dashboard Metrics

- Today's sales
- Sales this period
- Gross profit
- Average sale value
- Outstanding receivables
- Top selling products
- Sales by cashier

### Future Features

- Layaway
- Sales quotations
- Sales returns with reason codes
- Promotions
- Loyalty integration
- Multi-currency sales
- Offline receipt reprint controls

## Sale Items

### Purpose

Sale Items describe what is being sold on a sale document.

### Responsibilities

Owns:

- Sold product reference
- Quantity
- Unit sale price
- Line discount where enabled
- Line total
- Inventory reduction contribution

Never owns:

- Customer identity
- Sale lifecycle
- Product master data
- Ledger posting policy
- Cash payment behavior

### Lifecycle

Possible states:

- Draft
- Completed
- Cancelled
- Returned

Allowed transitions:

```text
Draft -> Completed
Draft -> Cancelled
Completed -> Returned
```

### Business Rules

- Sale items must belong to a sale.
- Product is required.
- Quantity must be greater than zero.
- Unit price cannot be negative.
- Archived products cannot be added to new sale items.
- Sale item totals must be recalculated when quantity, price, discount, or tax changes.
- Completed sale items cannot be edited directly.
- Stock-tracked sale items create stock-out inventory transactions when the sale is completed.
- Returns must reference the original sale item when possible.

### Relationships

- Sale items belong to sales.
- Sale items reference products and units.
- Sale items produce inventory effects when completed.
- Sales reports summarize sale items by customer, product, category, brand, cashier, and date.

### Events Produced

- Sale Item Added
- Sale Item Updated
- Sale Item Removed
- Sale Item Completed
- Sale Item Returned

### Events Consumed

- Sale Completed
- Sale Cancelled
- Product Archived

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager, Cashier, while sale is editable
- Edit: Owner, Admin, Manager, Cashier, while sale is editable
- Delete: Owner, Admin, Manager, Cashier, while sale is editable
- Approve: Inherited from sale approval rules
- Cancel: Inherited from sale cancellation rules

### Dashboard Metrics

- Sold quantity by product
- Revenue by product
- Gross margin by item
- Discount value by item

### Future Features

- Item-level promotions
- Serial-number sale capture
- Batch selection
- Weight-scale quantities
