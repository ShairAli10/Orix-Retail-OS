# Legacy Stock Import

## Purpose

Legacy Stock Import allows a shop to move current products and stock from a previous retail system into Orix Retail OS.

The feature is source-adapter based. A sample database export may come from one old system, but the Orix product capability is generic: import previous software items and current stock into the Orix database safely.

## Import Meaning

Orix does not copy old database tables directly into its own schema. That would break the approved architecture and create long-term data integrity problems.

Instead, the importer maps legacy records into Orix business concepts:

- Product master data becomes Orix products.
- Category-like values become Orix categories.
- Unit-like values become Orix units.
- The old system's current stock becomes Orix opening-stock inventory transactions.

This preserves the old stock quantity while still following Orix's rule that stock is derived from immutable inventory transactions.

## Supported First Adapter

The first adapter supports the sample export shape provided during development:

- Items CSV containing product master data.
- SQL dump containing store profile, stock locations, and current item quantities.

This adapter is intentionally not the name of the product feature. Future adapters can support other retail software exports without changing the UI concept.

## Required Data

The importer needs:

- Product name.
- Sale price.
- Purchase cost where available.
- Current stock quantity.
- Barcode where available.
- Category/unit where available.

If the old system separates item master data from stock balances, both exports are required.

## Current Stock Handling

Current stock from the old software is imported as opening stock.

Example:

```text
Old software current stock: 25
Orix import result: one opening-stock inventory transaction with quantity 25
Orix current stock after import: 25
```

The product record itself does not store stock.

## Validation

The importer must detect:

- Duplicate active barcodes.
- Duplicate product names.
- Missing product names.
- Negative stock.
- Missing stock rows.
- Existing Orix products with the same name or barcode.
- Zero or suspicious prices.

Clean rows can be imported while blocked rows are skipped for review.

## Import Workflow

1. User clicks **Import from previous software**.
2. User selects all export or backup files from the old software in one picker.
3. Orix detects which file contains products and which file contains stock quantities.
4. Orix shows plain-language detection status.
5. User previews totals, problems, and sample products.
6. User imports ready records.
7. Orix creates products through its normal persistence rules.
8. Orix posts current stock as opening-stock inventory transactions.
9. Orix records a business event.
10. Orix presents skipped rows for correction.

The UI must not ask the operator to understand SQL dumps, table names, or source-system internals.

## Non Goals

- Do not directly copy legacy tables into Orix.
- Do not bypass Orix product and inventory rules.
- Do not silently import negative stock.
- Do not overwrite existing Orix products.
- Do not import historical sales, purchases, or ledger rows in this phase.

## Future Enhancements

- Correction sheet export/import.
- Additional old software adapters.
- Field mapping UI for unknown CSV formats.
- Multi-branch stock-location mapping.
- Batch/expiry import when Orix supports those modules.
