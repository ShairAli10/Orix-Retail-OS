# OSPOS Migration

## Purpose

This document defines how Orix Retail OS should import product and inventory data from Open Source Point of Sale (OSPOS) exports.

Migration is an administrative workflow. It must never silently write records into production data without preview, validation, and an operator confirmation.

## Supported Inputs

Initial support targets:

- `ospos_items.csv` for product master data.
- `ospos.sql` for store profile, stock locations, and current item quantities.

The CSV alone is not enough for real inventory. The `receiving_quantity` column is treated as a default receiving quantity, not current stock.

## Source Mapping

| OSPOS source                     | Orix target meaning     |
| -------------------------------- | ----------------------- |
| `ospos_items.name`               | Product name            |
| `ospos_items.category`           | Category name           |
| `ospos_items.item_number`        | Barcode                 |
| `ospos_items.description`        | Product description     |
| `ospos_items.cost_price`         | Purchase price          |
| `ospos_items.unit_price`         | Sale price              |
| `ospos_items.reorder_level`      | Minimum stock           |
| `ospos_items.pack_name`          | Unit name               |
| `ospos_items.deleted`            | Archived source product |
| `ospos_item_quantities.quantity` | Opening stock candidate |
| `ospos_stock_locations`          | Source stock locations  |
| `ospos_app_config`               | Store profile hints     |

## Import Philosophy

- Products are created as product master data.
- Current stock becomes opening stock inventory transactions.
- Orix must not write stock directly onto products.
- Negative stock must be reviewed before import.
- Duplicate barcodes must be resolved before import.
- Archived OSPOS items are excluded by default.
- The original OSPOS item ID must be retained as migration metadata in the preview and later audit notes.

## Preview Command

Run a dry-run preview:

```bash
pnpm migration:ospos:preview -- --items /Users/shairali/Downloads/ospos_items.csv --sql /Users/shairali/Downloads/ospos.sql --out /Users/shairali/Downloads/orix-ospos-preview.json
```

The preview reports:

- Store profile found in the SQL dump.
- Product counts.
- Category and unit counts.
- Current quantity coverage.
- Duplicate barcodes.
- Duplicate names.
- Missing barcodes.
- Negative stock.
- Zero price records.
- A sample of mapped Orix product candidates.

The command exits with code `2` when blocking migration errors exist. This is intentional; the generated JSON is still useful for review.

## Required Review Before Import

Before enabling a write/import workflow, the operator must review:

- Whether archived OSPOS items should stay excluded.
- How duplicate barcodes should be resolved.
- Whether products without barcodes should be imported.
- Whether negative OSPOS stock should be reset to zero or imported as an adjustment exception.
- Whether multiple stock locations should map to one branch or multiple future branches.

## Future Import Workflow

The production workflow should be:

1. Select OSPOS files.
2. Parse files locally.
3. Show preview and blocking issues.
4. Let operator export a correction sheet.
5. Re-run validation.
6. Create categories, brands, and units.
7. Create products through the application layer.
8. Create opening stock through inventory application services.
9. Write business events and audit logs.
10. Show completion report.

## Known Risks

- OSPOS may contain duplicate active barcodes.
- Product names may include embedded barcodes.
- Some OSPOS stock quantities can be negative.
- CSV export may not include all tables required for a complete migration.
- Old inventory movement history is not imported in the first phase; only current stock becomes Orix opening stock.
