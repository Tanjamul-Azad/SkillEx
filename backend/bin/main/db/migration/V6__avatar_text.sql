-- V6: Widen avatar column to TEXT so it can store compressed base64 images.
-- Compatibility:
-- - Legacy schema used `avatar`
-- - Current schema uses `avatar_url`
-- Apply the change to whichever column exists.

SET @users_avatar_text_sql := (
	SELECT CASE
		WHEN EXISTS (
			SELECT 1 FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
		) THEN 'ALTER TABLE users MODIFY COLUMN avatar TEXT NULL'
		WHEN EXISTS (
			SELECT 1 FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
		) THEN 'ALTER TABLE users MODIFY COLUMN avatar_url TEXT NULL'
		ELSE 'ALTER TABLE users ADD COLUMN avatar_url TEXT NULL'
	END
);

PREPARE users_avatar_text_stmt FROM @users_avatar_text_sql;
EXECUTE users_avatar_text_stmt;
DEALLOCATE PREPARE users_avatar_text_stmt;
