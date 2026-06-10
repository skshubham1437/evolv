-- 004_create_notifications.up.sql
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    message    TEXT        NOT NULL,
    type       TEXT        NOT NULL DEFAULT 'info',
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
