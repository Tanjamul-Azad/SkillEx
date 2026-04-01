-- V15: Add username-first identity and profile visibility fields.

ALTER TABLE users
  ADD COLUMN username VARCHAR(50) NULL AFTER name,
  ADD COLUMN location VARCHAR(120) NULL AFTER university,
  ADD COLUMN connections_public TINYINT(1) NOT NULL DEFAULT 1 AFTER is_online;

-- Backfill username for existing users with deterministic uniqueness.
UPDATE users
SET username = LOWER(
  CONCAT(
    SUBSTRING(
      REGEXP_REPLACE(SUBSTRING_INDEX(email, '@', 1), '[^a-zA-Z0-9_]', ''),
      1,
      30
    ),
    '_',
    SUBSTRING(REPLACE(id, '-', ''), 1, 6)
  )
)
WHERE username IS NULL OR username = '';

ALTER TABLE users
  MODIFY COLUMN username VARCHAR(50) NOT NULL;

CREATE UNIQUE INDEX uq_users_username ON users(username);
CREATE INDEX idx_users_username ON users(username);
