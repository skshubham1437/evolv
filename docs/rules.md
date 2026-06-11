# Evolv Development Conventions & Rules

This document outlines the engineering rules, coding guidelines, and architectural constraints that must be followed by all contributors working on the Evolv project.

---

## 1. Architectural Boundaries

- **Separation of Concerns**: REST Handlers (`server/handlers/`) must only orchestrate requests. Domain logic, data queries, and external API requests belong in standard service helpers (`server/services/`) or database models.
- **Production Migrations**: Production database alterations (Postgres) must always be written in versioned SQL migration scripts inside `server/database/migrations/`. GORM AutoMigrate is strictly prohibited in production and must only be used in mock/integration unit tests.
- **SQLite vs. Postgres Compatibility**: SQLite is reserved for fast, CGO-free, in-memory mock testing. Production runs on PostgreSQL. Ensure all SQL migrations use standard expressions or feature checks (e.g. `DO $$` Pl/pgSQL wrappers in Postgres) to keep migration histories portable.

---

## 2. Coding Guidelines & Language Rules

### 2.1. Go Backend
- **Type-Safety**: Map database datetime fields to `TIMESTAMPTZ` (`*time.Time` in Go structs). Avoid raw strings for timestamps.
- **Structured Logging (`log/slog`)**: Use structured logging fields rather than print statements. Format output as JSON in production and text in development.
- **Observability Correlation**: Ensure every service call and database query passes a `context.Context` payload carrying the correlated `X-Request-ID` tracing header.

### 2.2. React TypeScript Frontend
- **Strict TypeScript**: Never use `any` unless absolutely unavoidable. Maintain 100% strict type safety so that `npm run build` succeeds without compiler warnings.
- **Theme Variables**: Apply the CSS tokens defined in `client/src/index.css` (e.g., `var(--color-primary)`, `var(--color-outline)`) for all styling. Do not write ad-hoc colors or raw hex values in individual component styles.
- **Brutalist Design Constraints**: All container panels must use sharp corners (`rounded-none`). Rounded corners are not permitted under the cyber-brutalist theme.

---

## 3. Resilience & Integration Patterns

- **AI Timeout Threshold**: Wrap all external AI / Gemini calls in a `15s` timeout context to prevent request hangs.
- **Circuit Breaker Pattern**: Wrap remote API endpoints in a Circuit Breaker (Closed $\leftrightharpoons$ Open $\leftrightharpoons$ Half-Open). Gracefully fallback to structured static responses if the breaker trips.
- **Token Bucket Rate Limiting**: Limit high-resource endpoints (like AI suggestions) per user (e.g. 20 calls/hour) using thread-safe token buckets. Return `429 Too Many Requests` when limits are exceeded.

---

## 4. Testing & Git Protocol

- **TDD (Test-Driven Development)**: Follow the red-green-refactor loop. Write integration tests validating public API outcomes instead of mock internal variables.
- **Uncached Test Validation**: Verify Go backend tests using uncached testing parameters (`go test -count=1 ./...`).
- **Commit Formatting**: Commit in small, focused vertical slices mapping directly to specific task checkpoints. Commit messages must use descriptive prefixes (e.g., `feat:`, `fix:`, `docs:`, `test:`).
