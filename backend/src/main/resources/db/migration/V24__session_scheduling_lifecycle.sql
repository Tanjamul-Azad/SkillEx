-- ============================================================
-- SkillEX V24 - Session scheduling lifecycle alignment
-- Adds proposal ownership, meeting type, and active lifecycle statuses.
-- ============================================================

SET @sessions_status_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'status'
    ),
    'ALTER TABLE sessions MODIFY COLUMN status ENUM(''PROPOSED'',''SCHEDULED'',''IN_PROGRESS'',''COMPLETED'',''CANCELLED'') NOT NULL DEFAULT ''PROPOSED''',
    'ALTER TABLE sessions ADD COLUMN status ENUM(''PROPOSED'',''SCHEDULED'',''IN_PROGRESS'',''COMPLETED'',''CANCELLED'') NOT NULL DEFAULT ''PROPOSED'''
  )
);
PREPARE sessions_status_stmt FROM @sessions_status_sql;
EXECUTE sessions_status_stmt;
DEALLOCATE PREPARE sessions_status_stmt;

SET @session_type_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'session_type'
    ),
    'ALTER TABLE sessions MODIFY COLUMN session_type ENUM(''VIDEO'',''AUDIO'') NOT NULL DEFAULT ''VIDEO''',
    'ALTER TABLE sessions ADD COLUMN session_type ENUM(''VIDEO'',''AUDIO'') NOT NULL DEFAULT ''VIDEO'''
  )
);
PREPARE session_type_stmt FROM @session_type_sql;
EXECUTE session_type_stmt;
DEALLOCATE PREPARE session_type_stmt;

SET @proposed_by_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'proposed_by'
    ),
    'SELECT 1',
    'ALTER TABLE sessions ADD COLUMN proposed_by VARCHAR(36) NULL'
  )
);
PREPARE proposed_by_stmt FROM @proposed_by_sql;
EXECUTE proposed_by_stmt;
DEALLOCATE PREPARE proposed_by_stmt;

SET @proposed_by_fk_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sessions'
        AND COLUMN_NAME = 'proposed_by'
        AND REFERENCED_TABLE_NAME = 'users'
    ),
    'SELECT 1',
    'ALTER TABLE sessions ADD CONSTRAINT fk_s_proposed_by FOREIGN KEY (proposed_by) REFERENCES users(id) ON DELETE SET NULL'
  )
);
PREPARE proposed_by_fk_stmt FROM @proposed_by_fk_sql;
EXECUTE proposed_by_fk_stmt;
DEALLOCATE PREPARE proposed_by_fk_stmt;

SET @idx_sessions_exchange_skill_status_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sessions'
        AND INDEX_NAME = 'idx_sessions_exchange_skill_status'
    ),
    'SELECT 1',
    'CREATE INDEX idx_sessions_exchange_skill_status ON sessions(exchange_id, skill_id, status)'
  )
);
PREPARE idx_sessions_exchange_skill_status_stmt FROM @idx_sessions_exchange_skill_status_sql;
EXECUTE idx_sessions_exchange_skill_status_stmt;
DEALLOCATE PREPARE idx_sessions_exchange_skill_status_stmt;
