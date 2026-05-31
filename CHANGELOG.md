# Changelog

All notable changes to the Evolv project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Rate limiting on authentication endpoints (token bucket: 10 burst, 2/sec sustained)
- Configurable CORS origin via `ALLOWED_ORIGIN` env var (no longer wildcard `*`)
- Database unique composite indexes on WeeklyPlan, MonthlyPlan, QuarterlyObjective, JournalEntry
- Performance composite index on HabitLog (habit_id, completed_at)
- `.env.example` files for both server and client
- `CONTRIBUTING.md` with development setup and conventions
- `CHANGELOG.md` (this file)
- Architecture Decision Records (ADR-0003 through ADR-0007)

### Changed
- **BREAKING**: CORS no longer allows `*` origin — set `ALLOWED_ORIGIN` in server `.env`
- Split monolithic `handlers/handlers.go` into `handlers/tasks.go`, `handlers/habits.go`, and `handlers/helpers.go`
- `UpdateTask` now uses an intermediate request struct to prevent field overwriting attacks
- Fixed N+1 database queries in `GetHabits`, `GetRoutines`, and `GetDailyDashboard` (batch query for today's completions)
- API base URL is now configurable via `VITE_API_URL` env var in the client
- `AuthContext` imports shared `API_BASE` instead of hardcoding the URL
- Extracted shared `HabitWithStatus` type and `respond()` / `getUserIDFromCtx()` helpers to `handlers/helpers.go`

### Removed
- Deleted monolithic `handlers/handlers.go` (code split into domain-specific files)
- Removed duplicate `getUserIDFromCtx` from `handlers/journal.go`

## [0.1.0] — 2026-05-10

### Added
- Initial MVP release
- Core Planning Hierarchy: Vision → Yearly → Quarterly → Monthly → Weekly → Daily
- Task management with priorities, projects, subtasks, and auto-rescheduling
- Habit tracking with streaks, streak shields, habit stacking, and heatmaps
- Journaling with mood/energy/stress tracking and AI sentiment analysis
- AI Life Coach: morning briefs, productivity insights, burnout risk, goal breakdown
- AI-generated weekly and monthly review summaries
- Focus Mode with live timer, ambient sound synthesis, and waveform visualization
- EOD Shutdown ritual wizard
- Premium dark/light "Paper & Glass" theme system
- Responsive design with mobile bottom navigation
- Analytics dashboard with productivity trends, time allocation, and momentum score
- Onboarding wizard (3-step: name → focus areas → primary goal)
- JWT authentication with bcrypt password hashing
- Interactive landing page with 3D tilt mockups and Web Audio synthesizers
