# ADR-0009: Versioned SQL Migrations

**Date**: 2026-06-11  
**Status**: Accepted  
**Deciders**: Engineering

---

## Context

The initial implementation used GORM's `AutoMigrate` on every server boot.
`AutoMigrate` adds columns but **never removes, renames, or alters** them.
Any column rename silently creates an empty new column and leaves the old one full of data that is now unreachable.
There is no migration history, no version tracking, and no rollback capability.

The premortem (June 2026) classified this as **Critical** — irreversible data loss risk on any schema change.

## Decision

Replace `AutoMigrate` with **golang-migrate** backed by hand-written SQL files that are embedded into the binary via `go:embed`.

### Directory layout

```
server/database/
  migrate.go          ← RunMigrations() called once at startup
  migrations/
    001_initial_schema.up.sql    ← full DDL snapshot of v1 schema
    001_initial_schema.down.sql  ← drop all tables
    002_streak_shield_doc.up.sql ← semantic documentation migration
    002_streak_shield_doc.down.sql
    NNN_<description>.{up,down}.sql  ← future migrations
```

### How it works

1. `database.RunMigrations()` is called once in `main()` after `database.Connect()`.
2. golang-migrate uses a `schema_migrations` table in PostgreSQL to track which versions have been applied.
3. `ErrNoChange` (all migrations already applied) is treated as success and logged at INFO level.
4. Any other error causes `log.Fatal`, preventing startup with a broken schema.
5. Migration files are embedded into the binary — no runtime filesystem access required.

### Writing new migrations

```bash
# Create the next numbered pair
touch server/database/migrations/003_add_task_recurrence.up.sql
touch server/database/migrations/003_add_task_recurrence.down.sql
```

Rules:
- Migration numbers must be monotonically increasing integers.
- Every `.up.sql` must have a matching `.down.sql` that fully reverses it.
- Migrations are **append-only** — never edit a migration that has been applied to production.
- Use `IF NOT EXISTS` / `IF EXISTS` guards where appropriate for idempotency.

## Consequences

- **Positive**: Full schema history; any version can be inspected or rolled back.
- **Positive**: Renames and column drops are now safe and explicit.
- **Positive**: CI can run `migrate down` to verify rollback works before merging.
- **Positive**: The embedded binary contains all migrations — no deploy artifact gap.
- **Negative**: Schema changes require a new SQL file instead of just editing a struct tag.
- **Migration path**: On first boot after this ADR, if the database already has tables from the GORM era, `001_initial_schema.up.sql` will fail (tables already exist). Use `IF NOT EXISTS` guards or run `migrate force 1` to mark version 1 as applied without re-running the DDL. The current migration files use `IF NOT EXISTS` for safety.
