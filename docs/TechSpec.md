# Technical Specification — Week 9 Gaps & Enhancements

This document describes the technical architecture, database schemas, API contracts, and frontend components implemented for the Week 9 functional enhancements in the Evolv application.

---

## 1. System Architecture

The implementation spans both the Go backend (`server/`) and the React TypeScript frontend (`client/`):

```mermaid
graph TD
    subgraph Client (React + TypeScript)
        UI[Pages: Goals, Tasks, Dashboard] --> API[API Layer: goals.ts, tasks.ts, journal.ts]
    end

    subgraph Server (Go + GORM)
        API --> Handlers[REST Handlers: goals.go, tasks.go, journal.go]
        Handlers --> Helpers[Helpers: Date Parser, Goal Progress Tracker]
        Helpers --> Models[GORM Models: Goal, Milestone, Task, EnergyLog]
        Models --> DB[(Database: PostgreSQL / SQLite)]
    end
```

---

## 2. Database Design & Schema Migrations

### 2.1. Versioned Database Migration Up
File: `server/database/migrations/005_functional_premortem_improvements.up.sql`

```sql
-- 1. Unify Date Schemas
-- Rename milestones.target_date to milestones.date if target_date exists (GORM AutoMigrate legacy compatibility)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='milestones' AND column_name='target_date'
    ) THEN
        ALTER TABLE milestones RENAME COLUMN target_date TO date;
    END IF;
END $$;

-- Convert goals.due_date from TEXT to TIMESTAMPTZ with robust regex casing
ALTER TABLE goals ALTER COLUMN due_date TYPE TIMESTAMPTZ USING (
    CASE 
        WHEN due_date IS NULL OR due_date = '' OR due_date = 'Ongoing' THEN NULL
        WHEN due_date ~ '^\d{4}-\d{2}-\d{2}' THEN due_date::TIMESTAMPTZ
        WHEN due_date ~ '^[A-Za-z]+ \d+$' THEN (due_date || ' 2026')::TIMESTAMPTZ
        ELSE NULL
    END
);

-- Convert milestones.date from TEXT to TIMESTAMPTZ with robust regex casing
ALTER TABLE milestones ALTER COLUMN date TYPE TIMESTAMPTZ USING (
    CASE 
        WHEN date IS NULL OR date = '' OR date = 'Ongoing' THEN NULL
        WHEN date ~ '^\d{4}-\d{2}-\d{2}' THEN date::TIMESTAMPTZ
        WHEN date ~ '^[A-Za-z]+ \d+$' THEN (date || ' 2026')::TIMESTAMPTZ
        ELSE NULL
    END
);

-- 2. Disconnected Planning Hierarchy
-- Add goal_id and objective_id columns to tasks
ALTER TABLE tasks ADD COLUMN goal_id BIGINT REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN objective_id BIGINT REFERENCES quarterly_objectives(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_objective_id ON tasks(objective_id);

-- 3. Eisenhower Matrix Fields
-- Add is_urgent and is_important columns to tasks
ALTER TABLE tasks ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN is_important BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. True Circadian Logs
-- Create energy_logs table
CREATE TABLE IF NOT EXISTS energy_logs (
    id        BIGSERIAL   PRIMARY KEY,
    user_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    energy    INT         NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_energy_logs_user_id ON energy_logs(user_id);
CREATE INDEX idx_energy_logs_logged_at ON energy_logs(logged_at);
```

### 2.2. GORM Go Models
Files: `server/models/goal.go`, `server/models/task.go`, `server/models/journal.go`

```go
// models/goal.go
type Goal struct {
    gorm.Model
    DueDate *time.Time `json:"due_date"`
    // ...
}

type Milestone struct {
    gorm.Model
    Quarter    string     `json:"quarter"`
    TargetDate *time.Time `gorm:"column:date" json:"date"`
    // ...
}

// models/task.go
type Task struct {
    gorm.Model
    GoalID      *uint `json:"goal_id"`
    ObjectiveID *uint `json:"objective_id"`
    IsUrgent    bool  `json:"is_urgent"`
    IsImportant bool  `json:"is_important"`
    // ...
}

// models/journal.go
type EnergyLog struct {
    ID       uint      `gorm:"primaryKey" json:"id"`
    UserID   uint      `gorm:"not null;index" json:"user_id"`
    LoggedAt time.Time `gorm:"default:NOW();index" json:"logged_at"`
    Energy   int       `gorm:"not null" json:"energy"` // 1-5 Scale
}
```

---

## 3. Backend Implementation & Helpers

### 3.1. Resilient Date Parser
File: `server/handlers/helpers.go`

Parses custom date formats dynamically, allowing smooth integrations with standard formats or legacy strings:

```go
func parseDateString(s string) (*time.Time, error) {
	if s == "" || s == "Ongoing" {
		return nil, nil
	}
	// Try RFC3339 format
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return &t, nil
	}
	// Try YYYY-MM-DD HTML5 format
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return &t, nil
	}
	// Try Month Day format (falls back to current year 2026)
	if t, err := time.Parse("January 2", s); err == nil {
		y2026 := time.Date(2026, t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		return &y2026, nil
	}
	return nil, fmt.Errorf("invalid date format: %s", s)
}
```

### 3.2. Automatic Goal Progress Recalculator
File: `server/handlers/helpers.go`

Wraps Goal progress calculation in a database transaction when associated key results or tasks change:

$$\text{Goal Progress \%} = \frac{\text{Completed Key Results} + \text{Completed Tasks}}{\text{Total Key Results} + \text{Total Tasks}} \times 100$$

```go
func UpdateGoalProgress(tx *gorm.DB, goalID uint) error {
	var goal models.Goal
	if err := tx.Preload("KeyResults").First(&goal, goalID).Error; err != nil {
		return err
	}

	var krCount, krDone int64
	krCount = int64(len(goal.KeyResults))
	for _, kr := range goal.KeyResults {
		if kr.IsDone {
			krDone++
		}
	}

	var taskCount, taskDone int64
	tx.Model(&models.Task{}).Where("goal_id = ?", goalID).Count(&taskCount)
	tx.Model(&models.Task{}).Where("goal_id = ? AND is_completed = true", goalID).Count(&taskDone)

	totalPoints := krCount + taskCount
	donePoints := krDone + taskDone

	var progress int
	if totalPoints > 0 {
		progress = int((float64(donePoints) / float64(totalPoints)) * 100)
	}

	return tx.Model(&goal).Update("progress", progress).Error;
}
```

---

## 4. API Specification

### 4.1. Log Energy Level
- **Endpoint**: `POST /api/energy`
- **Authentication**: JWT/Session cookie required
- **Request Body**:
  ```json
  {
    "energy": 4
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": 12,
    "user_id": 1,
    "logged_at": "2026-06-11T12:00:00Z",
    "energy": 4
  }
  ```

### 4.2. Updated Create Task
- **Endpoint**: `POST /api/tasks`
- **Request Body Parameters**:
  - `goal_id`: `integer` (nullable)
  - `objective_id`: `integer` (nullable)
  - `is_urgent`: `boolean`
  - `is_important`: `boolean`

---

## 5. Frontend & UI Architecture

### 5.1. Eisenhower Matrix Quadrant Layout
File: `client/src/pages/TasksPage.tsx`

Quadrants are partitioned dynamically on the client using the custom task priority flags:
- **Q1 (Do)**: `task.is_urgent && task.is_important`
- **Q2 (Schedule)**: `!task.is_urgent && task.is_important`
- **Q3 (Delegate)**: `task.is_urgent && !task.is_important`
- **Q4 (Postpone)**: `!task.is_urgent && !task.is_important`

Accent variables applied:
- Red: `--color-error`
- Teal: `--color-secondary`
- Violet: `--color-primary`
- Gray: `--color-outline`

### 5.2. Quick Energy Logger Check-in Widget
File: `client/src/pages/DashboardPage.tsx`

Provides a row of button options (`1` to `5`) which fire the API request and dispatch a `useToast` event upon completion:
```typescript
logEnergy(val)
  .then(() => showToast(`Energy log registered: Level ${val}/5`, 'success'))
  .catch((err) => showToast(err.message || 'Failed to log energy', 'error'))
```
Widget hovers match the intensity spectrum (Red $\to$ Orange $\to$ Yellow $\to$ Teal $\to$ Cyan).
