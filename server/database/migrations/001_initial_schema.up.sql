-- 001_initial_schema.up.sql
-- Full initial schema for Evolv, replacing GORM AutoMigrate.
-- This migration is the source of truth for the database schema from v1.0.

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL    PRIMARY KEY,
    email         TEXT         NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    name          TEXT         NOT NULL,
    preferences   JSONB        NOT NULL DEFAULT '[]',
    is_onboarded  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- ── Projects ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    color       TEXT        NOT NULL DEFAULT '#D2BBFF',
    status      TEXT        NOT NULL DEFAULT 'active',
    deadline    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id  ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id      BIGINT      REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id  BIGINT      REFERENCES tasks(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    description     TEXT,
    is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
    priority        TEXT        NOT NULL DEFAULT 'medium',
    due_date        TIMESTAMPTZ,
    position        INT         NOT NULL DEFAULT 0,
    tags            TEXT        NOT NULL DEFAULT '',
    dependencies    TEXT        NOT NULL DEFAULT '',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);

-- ── Habits ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
    id                       BIGSERIAL   PRIMARY KEY,
    user_id                  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stack_after_id           BIGINT      REFERENCES habits(id) ON DELETE SET NULL,
    title                    TEXT        NOT NULL,
    description              TEXT,
    frequency                TEXT        NOT NULL DEFAULT 'daily',
    streak                   INT         NOT NULL DEFAULT 0,
    category                 TEXT        NOT NULL DEFAULT 'Health',
    routine_type             TEXT        NOT NULL DEFAULT 'none',
    position                 INT         NOT NULL DEFAULT 0,
    streak_shield_active     BOOLEAN     NOT NULL DEFAULT FALSE,
    streak_shields_remaining INT         NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at               TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_habits_user_id    ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON habits(deleted_at);

-- ── Habit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_logs (
    id           BIGSERIAL   PRIMARY KEY,
    habit_id     BIGINT      NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_habitlog_habit_completed ON habit_logs(habit_id, completed_at);

-- ── Journal Entries ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT        NOT NULL,
    content    TEXT,
    mood       INT         NOT NULL DEFAULT 3,
    energy     INT         NOT NULL DEFAULT 3,
    stress     INT         NOT NULL DEFAULT 3,
    confidence INT         NOT NULL DEFAULT 3,
    gratitude  JSONB       NOT NULL DEFAULT '[]',
    wins       JSONB       NOT NULL DEFAULT '[]',
    lessons    JSONB       NOT NULL DEFAULT '[]',
    sentiment  TEXT,
    themes     JSONB       NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_deleted_at ON journal_entries(deleted_at);

-- ── Vision ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visions (
    id                  BIGSERIAL   PRIMARY KEY,
    user_id             BIGINT      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    core_values         JSONB       NOT NULL DEFAULT '[]',
    identity_statements JSONB       NOT NULL DEFAULT '[]',
    ideal_day           JSONB       NOT NULL DEFAULT '[]',
    vision_images       JSONB       NOT NULL DEFAULT '[]',
    future_self_text    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_visions_deleted_at ON visions(deleted_at);

-- ── Focus Areas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS focus_areas (
    id            BIGSERIAL   PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    icon          TEXT        NOT NULL DEFAULT 'star',
    current_score INT         NOT NULL DEFAULT 5,
    target_score  INT         NOT NULL DEFAULT 10,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_focus_areas_user_id    ON focus_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_areas_deleted_at ON focus_areas(deleted_at);

-- ── Bucket List Items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bucket_list_items (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT        NOT NULL,
    category     TEXT        NOT NULL DEFAULT 'general',
    is_completed BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bucket_list_items_user_id    ON bucket_list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_bucket_list_items_deleted_at ON bucket_list_items(deleted_at);

-- ── Goals ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    priority    TEXT        NOT NULL DEFAULT 'medium',
    due_date    TEXT,
    progress    INT         NOT NULL DEFAULT 0,
    status      TEXT        NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id    ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_deleted_at ON goals(deleted_at);

-- ── Key Results ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS key_results (
    id         BIGSERIAL   PRIMARY KEY,
    goal_id    BIGINT      NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    text       TEXT        NOT NULL,
    is_done    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_key_results_goal_id ON key_results(goal_id);

-- ── Milestones ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
    id          BIGSERIAL   PRIMARY KEY,
    goal_id     BIGINT      NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    quarter     TEXT,
    date        TEXT,
    title       TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'upcoming',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);

-- ── Weekly Plans ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_plans (
    id             BIGSERIAL   PRIMARY KEY,
    user_id        BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year           INT         NOT NULL,
    week_number    INT         NOT NULL,
    theme          TEXT,
    notes          TEXT,
    review_summary TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    UNIQUE (user_id, year, week_number)
);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_deleted_at ON weekly_plans(deleted_at);

-- ── Time Blocks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_blocks (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT        NOT NULL,
    start_time TEXT        NOT NULL,
    end_time   TEXT        NOT NULL,
    title      TEXT        NOT NULL,
    notes      TEXT,
    block_type TEXT        NOT NULL DEFAULT 'deep_work',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id    ON time_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_date       ON time_blocks(date);
CREATE INDEX IF NOT EXISTS idx_time_blocks_deleted_at ON time_blocks(deleted_at);

-- ── Quarterly Objectives ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quarterly_objectives (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id    BIGINT      REFERENCES goals(id) ON DELETE SET NULL,
    year       INT         NOT NULL,
    quarter    INT         NOT NULL,
    title      TEXT        NOT NULL,
    outcome    TEXT,
    status     TEXT        NOT NULL DEFAULT 'not_started',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_quarterly_objectives_user_id    ON quarterly_objectives(user_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_quarterly_objectives_deleted_at ON quarterly_objectives(deleted_at);

-- ── Monthly Plans ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_plans (
    id             BIGSERIAL   PRIMARY KEY,
    user_id        BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year           INT         NOT NULL,
    month          INT         NOT NULL,
    theme          TEXT,
    goals          JSONB       NOT NULL DEFAULT '[]',
    life_scores    JSONB       NOT NULL DEFAULT '{}',
    review_summary TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    UNIQUE (user_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_deleted_at ON monthly_plans(deleted_at);
