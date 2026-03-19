-- ============================================================
-- SkillEX — V4: Fix column types & ENUM values to match Hibernate entity mappings
-- All Java @Enumerated(EnumType.STRING) fields store name() = UPPERCASE
-- ============================================================

-- Compatibility guard for older local schemas:
-- If a target column is missing, add it with the expected type/default.
-- If it exists, normalize to the expected type/default.

SET @reviews_rating_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'rating'
    ),
    'ALTER TABLE reviews MODIFY COLUMN rating INT NOT NULL',
    'ALTER TABLE reviews ADD COLUMN rating INT NOT NULL DEFAULT 0'
  )
);
PREPARE reviews_rating_stmt FROM @reviews_rating_sql;
EXECUTE reviews_rating_stmt;
DEALLOCATE PREPARE reviews_rating_stmt;

-- ── reviews.rating: TINYINT → INT  (Integer in Java needs INT in DB) ────────
SET @reviews_check_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reviews'
        AND CONSTRAINT_NAME = 'chk_reviews_rating'
    ),
    'SELECT 1',
    'ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)'
  )
);
PREPARE reviews_check_stmt FROM @reviews_check_sql;
EXECUTE reviews_check_stmt;
DEALLOCATE PREPARE reviews_check_stmt;

SET @users_level_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'level'
    ),
    'ALTER TABLE users MODIFY COLUMN level ENUM(''NEWCOMER'',''LEARNER'',''PRACTITIONER'',''SKILLED'',''ADVANCED'',''MASTER'') NOT NULL DEFAULT ''NEWCOMER''',
    'ALTER TABLE users ADD COLUMN level ENUM(''NEWCOMER'',''LEARNER'',''PRACTITIONER'',''SKILLED'',''ADVANCED'',''MASTER'') NOT NULL DEFAULT ''NEWCOMER'''
  )
);
PREPARE users_level_stmt FROM @users_level_sql;
EXECUTE users_level_stmt;
DEALLOCATE PREPARE users_level_stmt;

-- ── users.level: mixed-case → UPPERCASE ────────────────────────────────────

SET @users_role_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    ),
    'ALTER TABLE users MODIFY COLUMN role ENUM(''STUDENT'',''ADMIN'') NOT NULL DEFAULT ''STUDENT''',
    'ALTER TABLE users ADD COLUMN role ENUM(''STUDENT'',''ADMIN'') NOT NULL DEFAULT ''STUDENT'''
  )
);
PREPARE users_role_stmt FROM @users_role_sql;
EXECUTE users_role_stmt;
DEALLOCATE PREPARE users_role_stmt;

-- ── users.role: lowercase → UPPERCASE ──────────────────────────────────────

SET @exchanges_status_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND COLUMN_NAME = 'status'
    ),
    'ALTER TABLE exchanges MODIFY COLUMN status ENUM(''PENDING'',''ACCEPTED'',''DECLINED'',''COMPLETED'',''CANCELLED'') NOT NULL DEFAULT ''PENDING''',
    'ALTER TABLE exchanges ADD COLUMN status ENUM(''PENDING'',''ACCEPTED'',''DECLINED'',''COMPLETED'',''CANCELLED'') NOT NULL DEFAULT ''PENDING'''
  )
);
PREPARE exchanges_status_stmt FROM @exchanges_status_sql;
EXECUTE exchanges_status_stmt;
DEALLOCATE PREPARE exchanges_status_stmt;

-- ── exchanges.status: lowercase → UPPERCASE ────────────────────────────────

SET @sessions_status_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'status'
    ),
    'ALTER TABLE sessions MODIFY COLUMN status ENUM(''SCHEDULED'',''COMPLETED'',''CANCELLED'') NOT NULL DEFAULT ''SCHEDULED''',
    'ALTER TABLE sessions ADD COLUMN status ENUM(''SCHEDULED'',''COMPLETED'',''CANCELLED'') NOT NULL DEFAULT ''SCHEDULED'''
  )
);
PREPARE sessions_status_stmt FROM @sessions_status_sql;
EXECUTE sessions_status_stmt;
DEALLOCATE PREPARE sessions_status_stmt;

-- ── sessions.status: lowercase → UPPERCASE ─────────────────────────────────

SET @offered_level_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_skills_offered' AND COLUMN_NAME = 'level'
    ),
    'ALTER TABLE user_skills_offered MODIFY COLUMN level ENUM(''BEGINNER'',''MODERATE'',''EXPERT'') NOT NULL DEFAULT ''BEGINNER''',
    'ALTER TABLE user_skills_offered ADD COLUMN level ENUM(''BEGINNER'',''MODERATE'',''EXPERT'') NOT NULL DEFAULT ''BEGINNER'''
  )
);
PREPARE offered_level_stmt FROM @offered_level_sql;
EXECUTE offered_level_stmt;
DEALLOCATE PREPARE offered_level_stmt;

-- ── user_skills_offered.level: lowercase → UPPERCASE ───────────────────────

SET @wanted_level_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_skills_wanted' AND COLUMN_NAME = 'level'
    ),
    'ALTER TABLE user_skills_wanted MODIFY COLUMN level ENUM(''BEGINNER'',''MODERATE'',''EXPERT'') NOT NULL DEFAULT ''BEGINNER''',
    'ALTER TABLE user_skills_wanted ADD COLUMN level ENUM(''BEGINNER'',''MODERATE'',''EXPERT'') NOT NULL DEFAULT ''BEGINNER'''
  )
);
PREPARE wanted_level_stmt FROM @wanted_level_sql;
EXECUTE wanted_level_stmt;
DEALLOCATE PREPARE wanted_level_stmt;

-- ── user_skills_wanted.level: lowercase → UPPERCASE ────────────────────────

SET @circle_activity_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'skill_circles' AND COLUMN_NAME = 'activity'
    ),
    'ALTER TABLE skill_circles MODIFY COLUMN activity ENUM(''VERY_ACTIVE'',''ACTIVE'',''QUIET'') NOT NULL DEFAULT ''ACTIVE''',
    'ALTER TABLE skill_circles ADD COLUMN activity ENUM(''VERY_ACTIVE'',''ACTIVE'',''QUIET'') NOT NULL DEFAULT ''ACTIVE'''
  )
);
PREPARE circle_activity_stmt FROM @circle_activity_sql;
EXECUTE circle_activity_stmt;
DEALLOCATE PREPARE circle_activity_stmt;

-- ── skill_circles.activity: emoji labels → UPPERCASE Java enum names ────────
