-- 003_add_task_recurrence.down.sql
ALTER TABLE tasks DROP COLUMN IF EXISTS recurrence;
