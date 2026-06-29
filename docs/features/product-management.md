# Product Management

Product Management is the first complete vertical slice in Orix Retail OS.

## Architecture

The feature follows the approved layered architecture:

```text
React renderer
Electron preload API
Typed Electron IPC
ProductManagementApplicationService
ProductManagementRepository
SQLite
```

The renderer never opens SQLite directly. The main process owns the database connection, migration
runner, transaction runner, repository factory, application service, and IPC handlers.

## Flow

1. The shopkeeper uses the Product Management screen.
2. The renderer calls the typed preload product API.
3. The preload bridge invokes a typed IPC channel.
4. The main process calls `ProductManagementApplicationService`.
5. The application service validates the request and opens a transaction for writes.
6. The repository persists or queries product data.
7. Events are persisted after successful commit.
8. The renderer refreshes list/catalog state from SQLite-backed IPC responses.

## Validation Rules

- Product name, category, unit, purchase price, and sale price are required.
- Purchase price, sale price, opening stock, and minimum stock must be zero or greater.
- Sale price below purchase price requires explicit confirmation.
- Product name must be unique inside the store.
- Barcode must be unique inside the store when provided.
- Products are archived with soft delete only.
- Products referenced by completed sales or received purchases cannot be archived.
- Categories, brands, and units are soft deleted.
- Categories, brands, and units cannot be archived while used by products.

## Known Limitations

- Product images are not included in this sprint.
- Sales, purchase, and inventory history tabs are visible as future tabs only.
- Authentication is not implemented yet; the desktop bootstrap creates a local owner actor.
- Multi-branch selection is not implemented yet; the default local branch is used.
- Product stock is derived from inventory transactions; only opening stock is created by this sprint.
