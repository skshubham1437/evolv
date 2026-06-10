-- 001_initial_schema.down.sql
-- Reverses 001_initial_schema.up.sql

DROP TABLE IF EXISTS monthly_plans         CASCADE;
DROP TABLE IF EXISTS quarterly_objectives  CASCADE;
DROP TABLE IF EXISTS time_blocks           CASCADE;
DROP TABLE IF EXISTS weekly_plans          CASCADE;
DROP TABLE IF EXISTS milestones            CASCADE;
DROP TABLE IF EXISTS key_results           CASCADE;
DROP TABLE IF EXISTS goals                 CASCADE;
DROP TABLE IF EXISTS bucket_list_items     CASCADE;
DROP TABLE IF EXISTS focus_areas           CASCADE;
DROP TABLE IF EXISTS visions               CASCADE;
DROP TABLE IF EXISTS journal_entries       CASCADE;
DROP TABLE IF EXISTS habit_logs            CASCADE;
DROP TABLE IF EXISTS habits                CASCADE;
DROP TABLE IF EXISTS tasks                 CASCADE;
DROP TABLE IF EXISTS projects              CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;
