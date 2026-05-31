# 3. Use GORM AutoMigrate for Database Schema Management

Date: 2026-05-10

## Status

Accepted

## Context

Database schema management can be handled through explicit migration files (e.g., golang-migrate, goose) or through an ORM's auto-migration feature. Explicit migrations offer precise control and reversibility, while auto-migration offers speed and simplicity during early development.

## Decision

We will use **GORM AutoMigrate** for database schema management during the MVP phase. All model structs in `server/models/` define the schema, and `main.go` calls `database.DB.AutoMigrate(...)` on startup to synchronize the database.

## Consequences

- **Pros:** Zero migration files to manage. Schema changes are made by editing Go structs directly. Fast iteration during early development.
- **Cons:** AutoMigrate only adds columns and indexes — it does not drop columns, rename fields, or handle destructive migrations. Manual SQL or a migration tool will be needed for schema-breaking changes in production. No built-in rollback mechanism.
- **Future:** When the schema stabilizes, consider switching to explicit migration files (e.g., `golang-migrate`) for production deployments.
