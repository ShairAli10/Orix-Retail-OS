# Purchases Domain

This document covers Purchases and Purchase Items.

## Purchases

### Purpose

Purchases represent goods or services acquired from suppliers and the resulting payable obligation.

### Responsibilities

Owns:

- Purchase document identity
- Supplier selection
- Purchase date
- Purchase status
- Purchase totals
- Receiving status
- Payable effect
- Cancellation reason

Never owns:

- Supplier master data
- Product master data
- Direct stock balance edits
- Cash account balance calculations
- Customer receivables

### Lifecycle

Possible states:

- Draft
- Approved
- Received
- Partially Paid
- Paid
- Cancelled

Allowed transitions:

```text
Draft -> Approved
Approved -> Received
Received -> Partially Paid
Partially Paid -> Paid
Received -> Paid
Draft -> Cancelled
Approved -> Cancelled
```

Received purchases cannot be deleted. Corrections require cancellation or reversal workflows where
allowed.

### Business Rules

- A purchase must have a supplier before approval.
- A purchase must have at least one purchase item before approval.
- Purchase item quantities must be greater than zero.
- Purchase item costs cannot be negative.
- Approved purchases can be received.
- Receiving a stock-tracked product increases inventory.
- Receiving a purchase creates or updates supplier payable balance through ledger-impacting records.
- Paid amount cannot exceed payable amount unless overpayment handling is explicitly supported.
- Cancelled purchases must not affect current inventory or payable balances.
- Purchases with payments cannot be cancelled without an approved reversal process.
- Purchase totals are calculated from purchase items, discounts, taxes where enabled, and adjustments.
- Supplier balances are calculated from ledger entries, not manually edited on the purchase.

### Relationships

- Purchases are made from suppliers.
- Purchase items identify products and quantities being acquired.
- Received purchases produce inventory transactions for stock-tracked products.
- Purchases increase supplier payables.
- Supplier payments reduce purchase-related obligations.
- Ledger records the financial effect of received purchases and payments.
- Reports use purchases for cost, payables, stock intake, and supplier performance.

### Events Produced

- Purchase Drafted
- Purchase Approved
- Purchase Received
- Purchase Partially Paid
- Purchase Paid
- Purchase Cancelled

### Events Consumed

- Supplier Archived
- Product Archived
- Supplier Payment Recorded
- Inventory Transaction Posted

### Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager, while draft
- Delete: Owner, Admin, only while draft
- Approve: Owner, Admin
- Cancel: Owner, Admin

### Dashboard Metrics

- Today's purchases
- Purchase value this period
- Outstanding payables
- Top suppliers
- Stock received value
- Purchase returns or cancellations

### Future Features

- Purchase orders
- Goods received notes
- Partial receiving
- Purchase returns
- Supplier invoice attachment
- Approval thresholds
- Landed cost allocation

## Purchase Items

### Purpose

Purchase Items describe what is being purchased on a purchase document.

### Responsibilities

Owns:

- Purchased product reference
- Quantity
- Unit cost
- Line discount where enabled
- Line total
- Receiving contribution

Never owns:

- Supplier identity
- Purchase lifecycle
- Product master data
- Ledger posting policy
- Cash payment behavior

### Lifecycle

Possible states:

- Draft
- Approved
- Received
- Cancelled

Allowed transitions:

```text
Draft -> Approved
Approved -> Received
Draft -> Cancelled
Approved -> Cancelled
```

### Business Rules

- Purchase items must belong to a purchase.
- Product is required.
- Quantity must be greater than zero.
- Unit cost cannot be negative.
- Archived products cannot be added to new purchase items.
- Purchase item totals must be recalculated when quantity, cost, discount, or tax changes.
- Received purchase items cannot be edited directly.
- Stock-tracked purchase items create stock-in inventory transactions when received.

### Relationships

- Purchase items belong to purchases.
- Purchase items reference products and units.
- Purchase items produce inventory effects when received.
- Purchase reports summarize purchase items by supplier, product, category, brand, and date.

### Events Produced

- Purchase Item Added
- Purchase Item Updated
- Purchase Item Removed
- Purchase Item Received

### Events Consumed

- Purchase Approved
- Purchase Received
- Product Archived

### Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin, Manager, while purchase is editable
- Edit: Owner, Admin, Manager, while purchase is editable
- Delete: Owner, Admin, Manager, while purchase is editable
- Approve: Inherited from purchase approval
- Cancel: Inherited from purchase cancellation

### Dashboard Metrics

- Purchased quantity by product
- Purchase cost by product
- Purchase cost by category
- Stock intake by item

### Future Features

- Line-level receiving status
- Bonus quantities
- Expiry and batch capture
- Supplier-specific item codes
