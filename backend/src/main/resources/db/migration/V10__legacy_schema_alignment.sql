-- ============================================================
-- SkillEX V10 — Legacy Schema Alignment
-- Aligns older local schemas with current JPA mappings without
-- dropping data, so the backend can run against the original DB.
-- ============================================================

-- ── users.avatar (expected by User entity) ───────────────────
SET @add_avatar_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
    ) THEN 'SELECT 1'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
    ) THEN 'ALTER TABLE users ADD COLUMN avatar VARCHAR(500) NULL'
    ELSE 'ALTER TABLE users ADD COLUMN avatar VARCHAR(500) NULL'
  END
);
PREPARE add_avatar_stmt FROM @add_avatar_sql;
EXECUTE add_avatar_stmt;
DEALLOCATE PREPARE add_avatar_stmt;

SET @copy_avatar_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
    )
    THEN 'UPDATE users SET avatar = LEFT(avatar_url, 500) WHERE avatar IS NULL AND avatar_url IS NOT NULL'
    ELSE 'SELECT 1'
  END
);
PREPARE copy_avatar_stmt FROM @copy_avatar_sql;
EXECUTE copy_avatar_stmt;
DEALLOCATE PREPARE copy_avatar_stmt;

-- ── users.joined_at (expected by User entity) ────────────────
SET @add_joined_at_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'joined_at'
    ) THEN 'SELECT 1'
    ELSE 'ALTER TABLE users ADD COLUMN joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
  END
);
PREPARE add_joined_at_stmt FROM @add_joined_at_sql;
EXECUTE add_joined_at_stmt;
DEALLOCATE PREPARE add_joined_at_stmt;

SET @copy_joined_at_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'joined_at'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'created_at'
    )
    THEN 'UPDATE users SET joined_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE joined_at IS NULL'
    ELSE 'SELECT 1'
  END
);
PREPARE copy_joined_at_stmt FROM @copy_joined_at_sql;
EXECUTE copy_joined_at_stmt;
DEALLOCATE PREPARE copy_joined_at_stmt;

-- ── exchanges.receiver_id (expected by Exchange entity) ──────
SET @add_receiver_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'receiver_id'
    ) THEN 'SELECT 1'
    ELSE 'ALTER TABLE exchanges ADD COLUMN receiver_id VARCHAR(36) NULL'
  END
);
PREPARE add_receiver_stmt FROM @add_receiver_sql;
EXECUTE add_receiver_stmt;
DEALLOCATE PREPARE add_receiver_stmt;

SET @copy_receiver_from_provider_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'receiver_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'provider_id'
    )
    THEN 'UPDATE exchanges SET receiver_id = provider_id WHERE receiver_id IS NULL AND provider_id IS NOT NULL'
    ELSE 'SELECT 1'
  END
);
PREPARE copy_receiver_from_provider_stmt FROM @copy_receiver_from_provider_sql;
EXECUTE copy_receiver_from_provider_stmt;
DEALLOCATE PREPARE copy_receiver_from_provider_stmt;

SET @fill_receiver_fallback_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'receiver_id'
    )
    THEN 'UPDATE exchanges SET receiver_id = requester_id WHERE receiver_id IS NULL'
    ELSE 'SELECT 1'
  END
);
PREPARE fill_receiver_fallback_stmt FROM @fill_receiver_fallback_sql;
EXECUTE fill_receiver_fallback_stmt;
DEALLOCATE PREPARE fill_receiver_fallback_stmt;

SET @receiver_not_null_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'receiver_id'
    ) THEN 'ALTER TABLE exchanges MODIFY COLUMN receiver_id VARCHAR(36) NOT NULL'
    ELSE 'SELECT 1'
  END
);
PREPARE receiver_not_null_stmt FROM @receiver_not_null_sql;
EXECUTE receiver_not_null_stmt;
DEALLOCATE PREPARE receiver_not_null_stmt;

SET @add_receiver_idx_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND INDEX_NAME = 'idx_exchanges_receiver'
    ),
    'SELECT 1',
    'CREATE INDEX idx_exchanges_receiver ON exchanges(receiver_id)'
  )
);
PREPARE add_receiver_idx_stmt FROM @add_receiver_idx_sql;
EXECUTE add_receiver_idx_stmt;
DEALLOCATE PREPARE add_receiver_idx_stmt;

-- ── skills nullability/type normalization for current Skill entity ───────────
SET @skills_icon_default_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'skills' AND COLUMN_NAME = 'icon'
    ) THEN 'UPDATE skills SET icon = ''Code'' WHERE icon IS NULL OR icon = '''''
    ELSE 'SELECT 1'
  END
);
PREPARE skills_icon_default_stmt FROM @skills_icon_default_sql;
EXECUTE skills_icon_default_stmt;
DEALLOCATE PREPARE skills_icon_default_stmt;

SET @skills_category_default_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'skills' AND COLUMN_NAME = 'category'
    ) THEN 'UPDATE skills SET category = ''Tech'' WHERE category IS NULL OR category = '''''
    ELSE 'SELECT 1'
  END
);
PREPARE skills_category_default_stmt FROM @skills_category_default_sql;
EXECUTE skills_category_default_stmt;
DEALLOCATE PREPARE skills_category_default_stmt;

SET @skills_icon_not_null_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'skills' AND COLUMN_NAME = 'icon'
    ) THEN 'ALTER TABLE skills MODIFY COLUMN icon VARCHAR(100) NOT NULL DEFAULT ''Code'''
    ELSE 'SELECT 1'
  END
);
PREPARE skills_icon_not_null_stmt FROM @skills_icon_not_null_sql;
EXECUTE skills_icon_not_null_stmt;
DEALLOCATE PREPARE skills_icon_not_null_stmt;

SET @skills_category_not_null_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'skills' AND COLUMN_NAME = 'category'
    ) THEN 'ALTER TABLE skills MODIFY COLUMN category VARCHAR(50) NOT NULL DEFAULT ''Tech'''
    ELSE 'SELECT 1'
  END
);
PREPARE skills_category_not_null_stmt FROM @skills_category_not_null_sql;
EXECUTE skills_category_not_null_stmt;
DEALLOCATE PREPARE skills_category_not_null_stmt;

SET @skills_description_varchar_sql := (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'skills' AND COLUMN_NAME = 'description'
    ) THEN 'ALTER TABLE skills MODIFY COLUMN description VARCHAR(500) NULL'
    ELSE 'SELECT 1'
  END
);
PREPARE skills_description_varchar_stmt FROM @skills_description_varchar_sql;
EXECUTE skills_description_varchar_stmt;
DEALLOCATE PREPARE skills_description_varchar_stmt;
