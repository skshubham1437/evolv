# Product Requirements Document (PRD) — Evolv Week 9 Gaps & Enhancements

## 1. Overview & Goal

Evolv is a high-performance productivity portal designed for knowledge workers and builders. To transition the application from a series of disjointed features to a cohesive, data-driven daily dashboard, this document details the product requirements for three key functional enhancements:

1. **Unified Date Schemas**: Migrate goal and milestone date entries from raw text placeholders (e.g., "Ongoing", "Q3") to structured, type-safe `TIMESTAMPTZ` dates in PostgreSQL, paired with native date pickers and elegant UI formatting.
2. **Eisenhower Matrix Task View**: Implement a toggleable 4-quadrant task prioritization system (Urgent vs. Important) with direct task-to-goal/objective linkages and automated progress tracking.
3. **True Circadian Energy Tracking**: Replace simulated hourly circadian heatmaps with real-time user energy check-ins (1–5 scale) aggregated alongside daily journal averages.

---

## 2. User Stories & Persona

**User Persona**: *The High-Performance Builder* (Developer, founder, or student who wants clear visual metrics of their goals, tasks, and daily energy levels without manual configuration overhead).

### User Stories
* **As a user planning a goal**, I want to pick a target date from a calendar picker instead of typing a text string, so that my milestones align cleanly in time.
* **As a user managing a cluttered task list**, I want to categorize tasks by urgency and importance in a 2x2 grid, so I can instantly identify high-leverage "Do First" activities and eliminate time-wasters.
* **As a user logging my energy levels**, I want a quick, one-click widget on my dashboard to log how I feel (1–5) throughout the day, so I can review an accurate circadian heatmap on the analytics page.

---

## 3. Detailed Feature Requirements

### 3.1. Unified Date Schemas

#### Core Behavior
- **Type-Safety**: Replaces the `TEXT` fields for `goals.due_date` and `milestones.date` with structured `TIMESTAMPTZ` fields.
- **Robust Migration Casting**: Legacy strings (like `"June 7"`) must be cast dynamically using regular expressions (e.g. appending `' 2026'` to month-day inputs) or resolve to `NULL` for generic placeholders like `"Ongoing"`.
- **Resilient API Parsing**: The backend date parser must accept RFC3339 timestamps (ISO) from JSON payloads, standard `YYYY-MM-DD` inputs from HTML5 fields, or empty strings.

#### UI/UX Requirements
- **Native Selectors**: Goals and milestones editing forms must use HTML5 `<input type="date">` inputs.
- **Premium Date Formats**: Display dates cleanly on cards using premium readable formats (e.g., `"Sep 30, 2026"`).

---

### 3.2. Eisenhower Matrix Filter & Priority Grid

#### Core Behavior
- **Task Attributes**: Every task model must include boolean attributes: `is_urgent` and `is_important`.
- **Goal Linkages**: Tasks must support a nullable link to a parent `Goal` (`goal_id`) or `QuarterlyObjective` (`objective_id`).
- **Automated Goal Progress**: Completing, deleting, or updating a task linked to a Goal must trigger a database transaction that automatically recalculates and updates the Goal's overall progress percentage.

#### UI/UX Requirements
- **View Toggle**: The `TasksPage` must feature a toggle between **List (Queue)** and **Eisenhower Matrix** view modes.
- **2x2 Grid Layout**: Under the Eisenhower view, render a 2x2 grid corresponding to the four quadrants:
  - **Q1: Urgent & Important** (Do First)
  - **Q2: Important, Not Urgent** (Schedule)
  - **Q3: Urgent, Not Important** (Delegate/Delegate)
  - **Q4: Not Urgent & Not Important** (Eliminate/Postpone)
- **Quadrant Aesthetics**: Each quadrant header must display a themed accent color matching Evolv's brutalist monospace style:
  - Q1: Red/Coral (`--color-error`)
  - Q2: Cyan/Teal (`--color-secondary`)
  - Q3: Violet/Purple (`--color-primary`)
  - Q4: Gray (`--color-outline`)
- **Responsive Interactions**: Users must be able to toggle `Urgent` / `Important` checkboxes and select `Goal` linkages from a dropdown directly in a task's expanded card. Doing so must dynamically shift the task row into the corresponding quadrant in real-time.

---

### 3.3. True Circadian Energy Check-ins

#### Core Behavior
- **Logger Model**: Introduce an `EnergyLog` model that persists individual user energy logs containing `logged_at` (TIMESTAMPTZ) and `energy` (1-5 integer).
- **Hourly Aggregation**: Analytics queries bucket logs by the closest hour slot.
- **Hybrid Heatmap Aggregation**: The dashboard heatmap aggregates actual user logs from `energy_logs` for logged slots, falling back to daily averages from journal entries where real-time logs are absent.

#### UI/UX Requirements
- **Dashboard Logger Widget**: Add an "Energy Check-in" card to the right-hand panel of the main dashboard.
- **One-Click Controls**: Offer buttons labeled `1` to `5` that log values instantly with a micro-interaction success toast.
- **Color Accent Scales**: Scale button hover effects from Red (1 - Low battery) to Orange, Yellow, Teal, and Cyan (5 - Max energy).

---

## 4. Non-Functional & Technical Requirements

- **Database Support**: Ensure compatible schema definitions and mock testing structures for PostgreSQL (production database) and SQLite (in-memory test databases).
- **TypeScript Health**: 100% strict TypeScript compliance for the Vite React client build (`npm run build` must run compilation successfully).
- **Graceful Error Handling**: Database transaction rollbacks if progress recalculation or date parsing fails.
- **Observability**: Request Tracing IDs (`X-Request-ID`) must correlate log statements across energy updates, task edits, and goal alterations.
