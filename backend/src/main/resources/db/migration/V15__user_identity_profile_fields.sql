-- ============================================================
-- SkillEX V15 — User Identity & Profile Fields
-- Adds profile identity fields used by modern user/profile flows.
-- ============================================================

-- username -----------------------------------------------------
SET @add_username_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
    ) THEN 'SELECT 1'
    ELSE 'ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL AFTER name'
  END
);
PREPARE add_username_stmt FROM @add_username_sql;
EXECUTE add_username_stmt;
DEALLOCATE PREPARE add_username_stmt;

SET @fill_username_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
    ) THEN
      'UPDATE users SET username = LOWER(CONCAT(SUBSTRING_INDEX(email, ''@'', 1), ''_'', SUBSTRING(id, 1, 6))) WHERE username IS NULL OR username = '''''
    ELSE 'SELECT 1'
  END
);
PREPARE fill_username_stmt FROM @fill_username_sql;
EXECUTE fill_username_stmt;
DEALLOCATE PREPARE fill_username_stmt;

SET @username_not_null_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
    ) THEN 'ALTER TABLE users MODIFY COLUMN username VARCHAR(50) NOT NULL'
    ELSE 'SELECT 1'
  END
);
PREPARE username_not_null_stmt FROM @username_not_null_sql;
EXECUTE username_not_null_stmt;
DEALLOCATE PREPARE username_not_null_stmt;

SET @add_uq_users_username_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_username'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username)'
  )
);
PREPARE add_uq_users_username_stmt FROM @add_uq_users_username_sql;
EXECUTE add_uq_users_username_stmt;
DEALLOCATE PREPARE add_uq_users_username_stmt;

SET @add_idx_users_username_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_username'
    ),
    'SELECT 1',
    'CREATE INDEX idx_users_username ON users(username)'
  )
);
PREPARE add_idx_users_username_stmt FROM @add_idx_users_username_sql;
EXECUTE add_idx_users_username_stmt;
DEALLOCATE PREPARE add_idx_users_username_stmt;

-- avatar_url ---------------------------------------------------
SET @add_avatar_url_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
    ) THEN 'SELECT 1'
    ELSE 'ALTER TABLE users ADD COLUMN avatar_url TEXT NULL AFTER avatar'
  END
);
PREPARE add_avatar_url_stmt FROM @add_avatar_url_sql;
EXECUTE add_avatar_url_stmt;
DEALLOCATE PREPARE add_avatar_url_stmt;

-- location -----------------------------------------------------
SET @add_location_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'location'
    ) THEN 'SELECT 1'
    ELSE 'ALTER TABLE users ADD COLUMN location VARCHAR(120) NULL AFTER university'
  END
);
PREPARE add_location_stmt FROM @add_location_sql;
EXECUTE add_location_stmt;
DEALLOCATE PREPARE add_location_stmt;

-- connections_public ------------------------------------------
SET @add_connections_public_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'connections_public'
    ) THEN 'SELECT 1'
    ELSE 'ALTER TABLE users ADD COLUMN connections_public TINYINT(1) NOT NULL DEFAULT 1 AFTER is_online'
  END
);
PREPARE add_connections_public_stmt FROM @add_connections_public_sql;
EXECUTE add_connections_public_stmt;
DEALLOCATE PREPARE add_connections_public_stmt;
