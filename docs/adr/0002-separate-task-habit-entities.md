# 2. Separate Task and Habit Entities

Date: 2026-05-10

## Status

Accepted

## Context

The application requires both a Task Engine and a Habit System. A key architectural decision is whether to treat habits as a specialized recurring task (sharing the same database table) or as a fundamentally separate entity.

## Decision

We will treat Tasks and Habits as **fundamentally separate entities** at the database layer (`Task` vs `Habit` & `HabitLog`). Tasks are outcome-driven (done once), while Habits are repetition and identity-driven (done continuously). 

However, on the frontend UI (specifically the Daily Focus Dashboard), they will be merged visually into one unified "Today" view so the user has a single place for execution.

## Consequences

- **Pros:** Clean database schema. Easier to track streaks, habit stacking, and repetition patterns without cluttering the Task table. Custom AI coaching logic can easily distinguish between missing a deadline (Task) and breaking a streak (Habit).
- **Cons:** The frontend and API layers must query and merge two separate data streams to render the daily view.
