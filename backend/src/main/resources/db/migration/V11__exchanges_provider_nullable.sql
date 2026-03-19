-- ============================================================
-- SkillEX V11 — Exchange provider/receiver compatibility
-- Some legacy schemas still have provider_id as NOT NULL while
-- current code writes receiver_id. Make provider_id nullable to
-- allow inserts using receiver_id only.
-- ============================================================

SET @provider_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'provider_id'
);

SET @provider_nullable_sql := (
  SELECT CASE
    WHEN @provider_exists > 0
    THEN 'ALTER TABLE exchanges MODIFY COLUMN provider_id VARCHAR(36) NULL'
    ELSE 'SELECT 1'
  END
);

PREPARE provider_nullable_stmt FROM @provider_nullable_sql;
EXECUTE provider_nullable_stmt;
DEALLOCATE PREPARE provider_nullable_stmt;

SET @backfill_provider_sql := (
  SELECT CASE
    WHEN @provider_exists > 0
      AND EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'receiver_id'
      )
    THEN 'UPDATE exchanges SET provider_id = receiver_id WHERE provider_id IS NULL AND receiver_id IS NOT NULL'
    ELSE 'SELECT 1'
  END
);

PREPARE backfill_provider_stmt FROM @backfill_provider_sql;
EXECUTE backfill_provider_stmt;
DEALLOCATE PREPARE backfill_provider_stmt;
