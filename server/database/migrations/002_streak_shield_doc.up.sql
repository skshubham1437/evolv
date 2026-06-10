-- 002_streak_shield_protection_days.up.sql
-- Replaces the streak shield mechanism that wrote synthetic fake HabitLog rows.
-- Instead, we track the number of days the shield has protected as a pure counter.
-- Existing fake logs created by the old mechanism cannot be retroactively
-- distinguished from real logs, so we leave historical data as-is and prevent
-- new synthetic logs from being created.

-- Nothing to alter at the DB level for this migration — the column set is the
-- same. The fix is purely in application logic (handlers/habits.go).
-- This migration exists to record the intent in the schema history.

-- Document the semantic change:
COMMENT ON COLUMN habits.streak_shields_remaining IS
  'Number of streak shield tokens available. Shields protect the streak counter '
  'when a day is missed, but do NOT create synthetic HabitLog entries.';
