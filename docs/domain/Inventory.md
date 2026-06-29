# Inventory Domain

This document covers Products, Categories, Brands, Units, Inventory, and Inventory Transactions.

## Products

### Purpose

Products represent sellable, purchasable, or stock-tracked items managed by the store.

### Responsibilities

Owns:

- Product identity
- Product name and display details
- Product code or SKU
- Barcode where applicable
- Product status
- Sales and purchase eligibility
- Stock tracking eligibility
- Category, brand, and unit classification
- Reorder guidance

Never owns:

- Customer pricing agreements
- Supplier balances
- Ledger balances
- Physical stock truth independent of inventory transactions
- Sale or purchase completion

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

- Product name is required.
- Active products must have a unit.
- Product codes should be unique when provided.
- Barcodes must be unique when provided.
- Products cannot be sold if archived.
- Products cannot be purchased if archived.
- Stock-tracked products cannot have stock changed by editing the product record.
- Product archival does not remove historical sales, purchases, or inventory transactions.
- Cost and price changes must be audit logged.
- Negative selling price is not allowed.
- Negative purchase cost is not allowed.
- Stock tracking mode should not be changed after transactions exist without an approved migration.

### Relationships

- Products belong to categories, may belong to brands, and use units.
- Sale items reference products.
- Purchase items reference products.
- Inventory transactions explain stock movement for stock-tracked products.
- Reports use product history for sales, stock, margin, and movement analysis.

### Events Produced

- Product Created
- Product Activated
- Product Updated
- Product Archived
- Product Reactivated

### Events Consumed

- Category Archived
- Brand Archived
- Unit Archived
- Sale Completed
- Purchase Received
- Inventory Adjusted

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager
- Delete: Owner, Admin, only when no history exists
- Approve: Owner, Admin, for sensitive price or stock-tracking changes
- Cancel: Owner, Admin, Manager, for pending product changes if approval workflow exists

### Dashboard Metrics

- Active products
- Low stock products
- Dead stock
- Top selling products
- Inventory value
- Gross margin by product

### Future Features

- Product variants
- Serial number tracking
- Batch and expiry tracking
- Product images
- Product bundles
- Multi-price levels

## Categories

### Purpose

Categories group products for navigation, reporting, and management.

### Responsibilities

Owns product classification labels and hierarchy where supported.

Never owns product prices, stock, sales, purchases, or ledger rules.

### Lifecycle

```text
Draft -> Active -> Archived
Archived -> Active
```

### Business Rules

- Category name is required.
- Category names should be unique within the same parent level.
- Categories with products cannot be deleted.
- Archived categories cannot be assigned to new active products.
- Historical reports must preserve category meaning at the time of transaction where required.

### Relationships

- Products are assigned to categories.
- Reports group products and sales by category.

### Events Produced

- Category Created
- Category Updated
- Category Archived
- Category Reactivated

### Events Consumed

- Product Created
- Product Updated

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager
- Delete: Owner, Admin, only when unused
- Approve: Owner, Admin, for category restructuring
- Cancel: Owner, Admin, Manager

### Dashboard Metrics

- Sales by category
- Inventory value by category
- Low stock by category

### Future Features

- Nested category trees
- Category-level tax rules
- Category-level promotions

## Brands

### Purpose

Brands identify product manufacturers, labels, or commercial brand families.

### Responsibilities

Owns brand identity and status.

Never owns product stock, pricing rules, supplier balances, or ledger rules.

### Lifecycle

```text
Draft -> Active -> Archived
Archived -> Active
```

### Business Rules

- Brand name is required.
- Brand names should be unique.
- Brands assigned to products cannot be deleted.
- Archived brands cannot be assigned to new active products.

### Relationships

- Products may be assigned to brands.
- Reports can group sales and inventory by brand.

### Events Produced

- Brand Created
- Brand Updated
- Brand Archived
- Brand Reactivated

### Events Consumed

- Product Created
- Product Updated

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager
- Delete: Owner, Admin, only when unused
- Approve: Owner, Admin
- Cancel: Owner, Admin, Manager

### Dashboard Metrics

- Sales by brand
- Inventory value by brand
- Top brands

### Future Features

- Brand supplier mapping
- Brand margin targets
- Brand performance scorecards

## Units

### Purpose

Units define how products are counted, purchased, sold, and reported.

### Responsibilities

Owns:

- Unit name
- Unit abbreviation
- Unit active status
- Future conversion relationships

Never owns:

- Product quantity on hand
- Sale quantities
- Purchase quantities
- Financial values

### Lifecycle

```text
Draft -> Active -> Archived
Archived -> Active
```

### Business Rules

- Unit name is required.
- Unit abbreviation should be unique.
- Products require an active unit.
- Units used by products or transactions cannot be deleted.
- Unit conversion is excluded from Version 1.0 unless explicitly approved.

### Relationships

- Products use units.
- Sale items and purchase items express quantities in product units.
- Reports display quantities using units.

### Events Produced

- Unit Created
- Unit Updated
- Unit Archived
- Unit Reactivated

### Events Consumed

- Product Created
- Product Updated

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager
- Delete: Owner, Admin, only when unused
- Approve: Owner, Admin
- Cancel: Owner, Admin, Manager

### Dashboard Metrics

- No primary dashboard metric; units support product and inventory reporting.

### Future Features

- Unit conversion
- Pack sizes
- Case-to-piece purchasing
- Weight-scale integration

## Inventory

### Purpose

Inventory represents the store's current stock position as derived from product stock movements.

### Responsibilities

Owns:

- Stock availability interpretation
- Reorder status
- Low stock evaluation
- Inventory valuation policy context

Never owns:

- Direct stock edits without transactions
- Product identity
- Purchase approval
- Sale completion
- Ledger posting rules

### Lifecycle

Inventory itself is derived. Stock positions change through inventory transactions.

Common stock states:

- In Stock
- Low Stock
- Out of Stock
- Overstocked
- Inactive Product Stock

Allowed movement causes:

```text
Purchase Received -> Stock Increases
Sale Completed -> Stock Decreases
Sale Cancelled or Returned -> Stock Increases
Inventory Adjustment -> Stock Increases or Decreases
Product Archived -> Stock Remains Historical
```

### Business Rules

- Stock quantity is derived from inventory transactions.
- Negative inventory is disabled by default.
- Only stock-tracked products affect inventory.
- Non-stock products may be sold or purchased without stock movement if allowed by settings.
- Low stock is determined by product reorder thresholds.
- Inventory value must be based on an approved valuation policy.
- Version 1.0 should use a simple and documented valuation approach before advanced costing.
- Stock adjustments require a reason.
- Stock reductions cannot make stock negative unless negative inventory is explicitly enabled.
- Inventory counts and adjustments must be audit logged.

### Relationships

- Products define what can be tracked.
- Purchases increase stock when received.
- Sales reduce stock when completed.
- Inventory transactions explain all movement.
- Ledger may consume inventory valuation effects when accounting integration is implemented.
- Reports use inventory for value, movement, low stock, and dead stock.

### Events Produced

- Inventory Level Changed
- Low Stock Detected
- Product Out Of Stock
- Inventory Count Started
- Inventory Adjusted

### Events Consumed

- Product Created
- Product Archived
- Purchase Received
- Sale Completed
- Sale Cancelled
- Sale Returned

### Permissions

- View: Owner, Admin, Manager, Cashier
- Create: Owner, Admin, Manager, for opening balances or counts
- Edit: Not direct; use adjustments
- Delete: Not allowed for posted movement history
- Approve: Owner, Admin, for stock adjustments
- Cancel: Owner, Admin, Manager, for draft counts or unapproved adjustments

### Dashboard Metrics

- Inventory value
- Low stock
- Out of stock products
- Dead stock
- Fast moving products
- Stock adjustment value

### Future Features

- Multi-location inventory
- Stock transfers
- Batch and expiry
- Serial numbers
- Cycle counting
- Barcode scanning workflows

## Inventory Transactions

### Purpose

Inventory Transactions are the permanent business explanation for stock movement.

### Responsibilities

Owns:

- Movement direction
- Movement quantity
- Movement reason
- Business source of movement
- Movement date

Never owns:

- Product master data
- Sale or purchase document approval
- Ledger posting policy
- User permissions outside movement approval

### Lifecycle

Possible states:

- Draft
- Posted
- Reversed

Allowed transitions:

```text
Draft -> Posted
Posted -> Reversed
```

Posted transactions cannot be edited. Corrections require reversal and a new transaction.

### Business Rules

- Every stock movement must have an inventory transaction.
- Posted inventory transactions are immutable.
- Reversals must reference the original business reason.
- Manual adjustments require approval if configured.
- Quantity must be greater than zero.
- Movement direction determines whether stock increases or decreases.
- Inventory transactions must reference a business source such as sale, purchase, adjustment, or
  return.

### Relationships

- Products are affected by inventory transactions.
- Sales, purchases, returns, and adjustments produce inventory transactions.
- Reports calculate movement and stock from inventory transactions.
- Audit logs record posting and reversal.

### Events Produced

- Inventory Transaction Drafted
- Inventory Transaction Posted
- Inventory Transaction Reversed

### Events Consumed

- Sale Completed
- Purchase Received
- Inventory Adjustment Approved
- Sale Return Completed

### Permissions

- View: Owner, Admin, Manager
- Create: Owner, Admin, Manager
- Edit: Owner, Admin, Manager, only while draft
- Delete: Owner, Admin, only while draft
- Approve: Owner, Admin
- Cancel: Owner, Admin, Manager, only while draft

### Dashboard Metrics

- Stock movement count
- Adjustment value
- Fast moving products
- Dead stock
- Stock discrepancies

### Future Features

- Transfer transactions
- Manufacturing or assembly transactions
- Automated shrinkage analysis
- Inventory forecast events
