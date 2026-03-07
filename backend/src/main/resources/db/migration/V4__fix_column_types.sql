-- ============================================================
-- SkillEX — V4: Fix column types & ENUM values to match Hibernate entity mappings
-- All Java @Enumerated(EnumType.STRING) fields store name() = UPPERCASE
-- ============================================================

-- ── reviews.rating: TINYINT → INT  (Integer in Java needs INT in DB) ────────
ALTER TABLE reviews MODIFY COLUMN rating INT NOT NULL;
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5);

-- ── users.level: mixed-case → UPPERCASE ────────────────────────────────────
ALTER TABLE users MODIFY COLUMN level
  ENUM('NEWCOMER','LEARNER','PRACTITIONER','SKILLED','ADVANCED','MASTER')
  NOT NULL DEFAULT 'NEWCOMER';

-- ── users.role: lowercase → UPPERCASE ──────────────────────────────────────
ALTER TABLE users MODIFY COLUMN role
  ENUM('STUDENT','ADMIN')
  NOT NULL DEFAULT 'STUDENT';

-- ── exchanges.status: lowercase → UPPERCASE ────────────────────────────────
ALTER TABLE exchanges MODIFY COLUMN status
  ENUM('PENDING','ACCEPTED','DECLINED','COMPLETED','CANCELLED')
  NOT NULL DEFAULT 'PENDING';

-- ── sessions.status: lowercase → UPPERCASE ─────────────────────────────────
ALTER TABLE sessions MODIFY COLUMN status
  ENUM('SCHEDULED','COMPLETED','CANCELLED')
  NOT NULL DEFAULT 'SCHEDULED';

-- ── user_skills_offered.level: lowercase → UPPERCASE ───────────────────────
ALTER TABLE user_skills_offered MODIFY COLUMN level
  ENUM('BEGINNER','MODERATE','EXPERT')
  NOT NULL DEFAULT 'BEGINNER';

-- ── user_skills_wanted.level: lowercase → UPPERCASE ────────────────────────
ALTER TABLE user_skills_wanted MODIFY COLUMN level
  ENUM('BEGINNER','MODERATE','EXPERT')
  NOT NULL DEFAULT 'BEGINNER';

-- ── skill_circles.activity: emoji labels → UPPERCASE Java enum names ────────
ALTER TABLE skill_circles MODIFY COLUMN activity
  ENUM('VERY_ACTIVE','ACTIVE','QUIET')
  NOT NULL DEFAULT 'ACTIVE';
