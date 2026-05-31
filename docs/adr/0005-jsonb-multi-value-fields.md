# 5. Store Multi-Value Fields as JSONB Instead of Relational Tables

Date: 2026-05-12

## Status

Accepted

## Context

Several models contain fields that are naturally arrays or free-form lists: `gratitude`, `wins`, `lessons` (JournalEntry), `core_values`, `identity_statements` (Vision), `goals` (MonthlyPlan). These could be stored as separate relational tables with foreign keys, or as JSONB columns in PostgreSQL.

## Decision

We will store these multi-value fields as **JSONB columns** (`gorm:"type:jsonb;default:'[]'"`) directly on the parent model, rather than creating separate relational tables.

## Consequences

- **Pros:** Dramatically simpler schema — no join tables for small, user-specific lists. Faster reads (single query vs. joins). Natural fit for data that is always loaded with its parent. PostgreSQL JSONB supports indexing and querying if needed later.
- **Cons:** Cannot enforce referential integrity on individual items. Harder to query across users (e.g., "find all users grateful for X"). Array manipulation requires loading the full array, modifying, and saving back.
- **Trade-off:** Acceptable for personal productivity data where these fields are always loaded with their parent entity and never queried independently across users.
