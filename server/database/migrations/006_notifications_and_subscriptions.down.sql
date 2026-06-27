DROP TABLE IF EXISTS push_subscriptions;
ALTER TABLE users DROP COLUMN IF EXISTS push_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS weekly_digest_enabled;
