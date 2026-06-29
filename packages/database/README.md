# Database Package

SQLite infrastructure boundary.

Planned responsibilities:

- Database connection lifecycle
- Drizzle ORM setup
- Migrations
- Repository implementations

This package must not contain business decisions. Repositories load and persist data; application
services decide what should happen.
