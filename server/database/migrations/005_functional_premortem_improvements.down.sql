-- 005_functional_premortem_improvements.down.sql

-- Drop energy_logs table
DROP TABLE IF EXISTS energy_logs;

-- Drop task columns and indexes
DROP INDEX IF EXISTS idx_tasks_objective_id;
DROP INDEX IF EXISTS idx_tasks_goal_id;

ALTER TABLE tasks DROP COLUMN IF EXISTS is_important;
ALTER TABLE tasks DROP COLUMN IF EXISTS is_urgent;
ALTER TABLE tasks DROP COLUMN IF EXISTS objective_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS goal_id;

-- Revert milestone date and goal due_date to TEXT
ALTER TABLE milestones ALTER COLUMN date TYPE TEXT;
ALTER TABLE goals ALTER COLUMN due_date TYPE TEXT;
