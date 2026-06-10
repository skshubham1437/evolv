-- 003_add_task_recurrence.up.sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT '';
