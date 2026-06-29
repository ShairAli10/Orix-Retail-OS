# Inventory Management

## Purpose

Inventory Management is the source of truth for stock quantities in Orix Retail OS.

Stock is never stored as a mutable product balance. Current stock is always calculated from posted inventory transactions.

## Inventory Philosophy

- Every stock change creates an immutable inventory transaction.
- Product records describe sellable items; they do not own stock balances.
- Reports and dashboards derive from transaction history.
- Negative stock is blocked by default for manual decreases.
- Opening stock is recorded once per product to prevent duplicate starting balances.

## Transaction Model

Inventory transactions use:

- Product
- Branch
- Business day
- Direction: `in` or `out`
- Quantity
- Unit cost
- Movement type
- Source type and source ID
- Posted user and timestamp

Supported Sprint 003 movement reasons:

- Opening Stock
- Damaged
- Expired
- Lost
- Found
- Manual Correction
- Stock Count Difference
- Supplier Replacement

## Stock Calculation

Current stock is calculated as:

```text
SUM(in quantities) - SUM(out quantities)
```

Available stock currently equals current stock. Reserved stock is intentionally `0` until POS order reservation exists.

Inventory value is calculated from current stock:

```text
Purchase value = current stock * purchase cost
Retail value = current stock * sale price
```

## Adjustment Rules

- Product must exist and be active.
- Quantity must be positive.
- Decreases cannot make stock negative.
- Adjustments are posted immediately.
- Adjustments are never edited after posting.

## Opening Stock

Opening stock supports manual bulk entry and CSV preview.

Opening stock creates `opening-stock` inventory transactions with direction `in`.

Duplicate opening stock for the same product is blocked.

## CSV Format

The CSV import expects a header row followed by:

```csv
barcode,quantity,unitCost,notes
123456789,10,250.00,Initial shelf count
```

Rows are previewed before posting. Rows that cannot match a product by barcode must be corrected before confirmation.

## Known Limitations

- Reserved stock will be implemented with POS/order reservation.
- Batch, expiry, and serial numbers are future tabs only.
- Last purchase and last sale appear as empty states until Purchase and POS workflows are implemented.
