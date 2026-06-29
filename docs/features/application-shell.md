# Application Shell

## Purpose

The application shell is the permanent desktop frame for Orix Retail OS. It owns the title bar, sidebar navigation, main content outlet, status bar, theme preference, startup context, and global error/toast surfaces.

Feature modules render inside the shell. They must not create their own full-window layout.

## Layout

- Title bar: store, business day status, user, branch, clock, quick search, notifications, settings.
- Sidebar: typed module navigation with collapsible state persisted locally.
- Main content: routed feature outlet.
- Status bar: database status, branch, business day, app version, offline sync, printer placeholder.

## Navigation

Routes are typed in `apps/desktop/src/renderer/routing.ts`.

The shell uses Electron-friendly browser history paths, not hash routing. Deep links such as `/products` and `/settings` resolve to typed route IDs.

Only Products is fully implemented in Sprint 002. Other modules intentionally render a Coming Soon page while preserving navigation contracts.

## Design System

Reusable shell-level primitives are styled in `apps/desktop/src/renderer/styles.css`:

- Button variants
- Cards
- Tables
- Dialogs
- Drawers
- Inputs
- Selects
- Badges
- Toasts
- Empty states
- Loading spinner

Future modules should reuse these styles before introducing new UI primitives.

## Startup Lifecycle

1. Electron main initializes SQLite.
2. Migrations run.
3. Bootstrap store, branch, user, business day, categories, and units are ensured.
4. IPC handlers register.
5. Renderer loads the dashboard route.
6. Renderer requests app context and settings.
7. Theme preference is applied.

## Settings

Application settings are persisted in the `settings` table under the `application.shell` key as JSON. Sprint 002 supports:

- Theme
- Store display name
- Receipt header
- Receipt footer
- Backup location

## Dashboard Data

Dashboard metrics are calculated from existing transactional tables. Empty databases show zero values and meaningful empty states; fake sample data is never used.

## Keyboard Shortcuts

- `Ctrl+1`: Dashboard
- `Ctrl+2`: POS
- `Ctrl+3`: Products
- `Ctrl+4`: Inventory
- `Ctrl+,`: Settings
