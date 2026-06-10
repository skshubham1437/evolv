-- 005_functional_premortem_improvements.up.sql

-- 1. Unify Date Schemas
-- Rename milestones.target_date to milestones.date if target_date exists (GORM AutoMigrate legacy)
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

-- Convert goals.due_date from TEXT to TIMESTAMPTZ
ALTER TABLE goals ALTER COLUMN due_date TYPE TIMESTAMPTZ USING (
    CASE 
        WHEN due_date IS NULL OR due_date = '' OR due_date = 'Ongoing' THEN NULL
        WHEN due_date ~ '^\d{4}-\d{2}-\d{2}' THEN due_date::TIMESTAMPTZ
        WHEN due_date ~ '^[A-Za-z]+ \d+$' THEN (due_date || ' 2026')::TIMESTAMPTZ
        ELSE NULL
    END
);

-- Convert milestones.date from TEXT to TIMESTAMPTZ
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
