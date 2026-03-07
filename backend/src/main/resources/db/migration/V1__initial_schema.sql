-- ============================================================
-- SkillEX — MySQL Initial Schema  V1
-- Compatible with: MySQL 8.0+ / MariaDB 10.6+
--
-- IMPORTANT: The `skillex` database must already exist before Flyway runs.
-- Create it manually in phpMyAdmin / mysql CLI:
--   CREATE DATABASE skillex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--
-- Flyway cannot run CREATE DATABASE / USE statements — they are intentionally
-- omitted here. The DataSource in application.properties points to the DB directly.
-- ============================================================

-- ── users ────────────────────────────────────────────────────
-- Stores registered users. Spring Boot entity: User.java
CREATE TABLE IF NOT EXISTS users (
  id                  VARCHAR(36)   NOT NULL DEFAULT (UUID())   COMMENT 'UUID primary key',
  name                VARCHAR(100)  NOT NULL                    COMMENT 'Full display name',
  email               VARCHAR(255)  NOT NULL                    COMMENT 'Unique login email',
  password_hash       VARCHAR(255)  NOT NULL                    COMMENT 'BCrypt hashed password',
  avatar              VARCHAR(500)  DEFAULT ''                  COMMENT 'Profile image URL',
  university          VARCHAR(200)  DEFAULT ''                  COMMENT 'University / institution',
  bio                 TEXT                                      COMMENT 'Short personal bio',
  skillex_score       INT           NOT NULL DEFAULT 0          COMMENT 'Platform reputation score',
  -- Matches UserLevel enum names stored by JPA EnumType.STRING
  level               ENUM('NEWCOMER','LEARNER','PRACTITIONER','SKILLED','ADVANCED','MASTER')
                                    NOT NULL DEFAULT 'NEWCOMER',
  sessions_completed  INT           NOT NULL DEFAULT 0,
  rating              DECIMAL(3,2)  NOT NULL DEFAULT 0.00       COMMENT 'Average review rating (0–5)',
  is_online           TINYINT(1)    NOT NULL DEFAULT 0,
  -- Matches UserRole enum names stored by JPA EnumType.STRING
  role                ENUM('STUDENT','ADMIN')
                                    NOT NULL DEFAULT 'STUDENT',
  joined_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── skills ───────────────────────────────────────────────────
-- Master skill catalog. Spring Boot entity: Skill.java
CREATE TABLE IF NOT EXISTS skills (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  name        VARCHAR(100)  NOT NULL,
  icon        VARCHAR(100)  NOT NULL DEFAULT 'Code'  COMMENT 'Lucide icon name',
  category    VARCHAR(50)   NOT NULL                 COMMENT 'Tech / Design / Creative / …',
  description VARCHAR(500)  DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── user_skills_offered ──────────────────────────────────────
-- Skills a user can teach. Spring Boot: @ManyToMany UserSkillOffered.java
CREATE TABLE IF NOT EXISTS user_skills_offered (
  user_id     VARCHAR(36)   NOT NULL,
  skill_id    VARCHAR(36)   NOT NULL,
  -- Matches SkillProficiency enum names stored by JPA EnumType.STRING
  level       ENUM('BEGINNER','MODERATE','EXPERT') NOT NULL DEFAULT 'BEGINNER',
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_uso_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_uso_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── user_skills_wanted ──────────────────────────────────────────────
-- Skills a user wants to learn. Spring Boot: @ManyToMany UserSkillWanted.java
CREATE TABLE IF NOT EXISTS user_skills_wanted (
  user_id     VARCHAR(36)   NOT NULL,
  skill_id    VARCHAR(36)   NOT NULL,
  level       ENUM('BEGINNER','MODERATE','EXPERT') NOT NULL DEFAULT 'BEGINNER',
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_usw_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_usw_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── exchanges ─────────────────────────────────────────────────
-- Peer skill-exchange requests. Spring Boot entity: Exchange.java
CREATE TABLE IF NOT EXISTS exchanges (
  id               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  requester_id     VARCHAR(36)   NOT NULL              COMMENT 'User who sent the request',
  receiver_id      VARCHAR(36)   NOT NULL              COMMENT 'User who received the request',
  offered_skill_id VARCHAR(36)   DEFAULT NULL          COMMENT 'Skill requester offers to teach',
  wanted_skill_id  VARCHAR(36)   DEFAULT NULL          COMMENT 'Skill requester wants to learn',
  message          TEXT          DEFAULT NULL          COMMENT 'Optional introductory message',
  -- Matches ExchangeStatus enum names stored by JPA EnumType.STRING
  status           ENUM('PENDING','ACCEPTED','DECLINED','COMPLETED','CANCELLED')
                                 NOT NULL DEFAULT 'PENDING',
  session_date     DATETIME      DEFAULT NULL          COMMENT 'Agreed session datetime (UTC)',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ex_requester FOREIGN KEY (requester_id)     REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ex_receiver  FOREIGN KEY (receiver_id)      REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ex_offered   FOREIGN KEY (offered_skill_id) REFERENCES skills(id) ON DELETE SET NULL,
  CONSTRAINT fk_ex_wanted    FOREIGN KEY (wanted_skill_id)  REFERENCES skills(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── sessions ─────────────────────────────────────────────────
-- A scheduled teaching session linked to an exchange. Spring Boot: Session.java
CREATE TABLE IF NOT EXISTS sessions (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  exchange_id     VARCHAR(36)   NOT NULL,
  teacher_id      VARCHAR(36)   NOT NULL,
  learner_id      VARCHAR(36)   NOT NULL,
  skill_id        VARCHAR(36)   NOT NULL,
  scheduled_at    DATETIME      NOT NULL,
  duration_mins   INT           NOT NULL DEFAULT 60,
  -- Matches SessionStatus enum names stored by JPA EnumType.STRING
  status          ENUM('SCHEDULED','COMPLETED','CANCELLED')
                                NOT NULL DEFAULT 'SCHEDULED',
  meet_link       VARCHAR(500)  DEFAULT NULL            COMMENT 'Google Meet / Zoom link',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_s_exchange FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE,
  CONSTRAINT fk_s_teacher  FOREIGN KEY (teacher_id)  REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_s_learner  FOREIGN KEY (learner_id)  REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_s_skill    FOREIGN KEY (skill_id)    REFERENCES skills(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── reviews ──────────────────────────────────────────────────
-- Post-session reviews. Spring Boot entity: Review.java
CREATE TABLE IF NOT EXISTS reviews (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  session_id  VARCHAR(36)   NOT NULL,
  from_user   VARCHAR(36)   NOT NULL,
  to_user     VARCHAR(36)   NOT NULL,
  skill_id    VARCHAR(36)   NOT NULL,
  rating      TINYINT       NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT          DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_r_session   FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_r_from_user FOREIGN KEY (from_user)  REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_r_to_user   FOREIGN KEY (to_user)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_r_skill     FOREIGN KEY (skill_id)   REFERENCES skills(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── events ───────────────────────────────────────────────────
-- Community events. Spring Boot entity: Event.java
CREATE TABLE IF NOT EXISTS events (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  title           VARCHAR(200)  NOT NULL,
  description     TEXT          DEFAULT NULL,
  host_id         VARCHAR(36)   NOT NULL,
  event_date      DATETIME      NOT NULL,
  location        VARCHAR(300)  DEFAULT '',
  is_online       TINYINT(1)    NOT NULL DEFAULT 1,
  cover_gradient  VARCHAR(200)  DEFAULT 'from-primary to-secondary',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_e_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── event_skills ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_skills (
  event_id    VARCHAR(36) NOT NULL,
  skill_id    VARCHAR(36) NOT NULL,
  PRIMARY KEY (event_id, skill_id),
  CONSTRAINT fk_es_event FOREIGN KEY (event_id) REFERENCES events(id)  ON DELETE CASCADE,
  CONSTRAINT fk_es_skill FOREIGN KEY (skill_id) REFERENCES skills(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── discussions ──────────────────────────────────────────────
-- Community discussion board. Spring Boot entity: Discussion.java
CREATE TABLE IF NOT EXISTS discussions (
  id         VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  title      VARCHAR(300)  NOT NULL,
  content    TEXT          NOT NULL,
  author_id  VARCHAR(36)   NOT NULL,
  category   VARCHAR(100)  DEFAULT 'General',
  upvotes    INT           NOT NULL DEFAULT 0,
  replies    INT           NOT NULL DEFAULT 0,
  views      INT           NOT NULL DEFAULT 0,
  is_pinned  TINYINT(1)    NOT NULL DEFAULT 0,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_d_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── skill_circles ────────────────────────────────────────────
-- Named groups organized around a skill. Spring Boot entity: SkillCircle.java
CREATE TABLE IF NOT EXISTS skill_circles (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  name          VARCHAR(200)  NOT NULL,
  icon          VARCHAR(50)   DEFAULT '⚡',
  member_count  INT           NOT NULL DEFAULT 0,
  last_session  DATETIME      DEFAULT NULL,
  -- Matches ActivityLevel enum names stored by JPA EnumType.STRING
  activity      ENUM('VERY_ACTIVE','ACTIVE','QUIET') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Indexes for performance ───────────────────────────────────
CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_users_score            ON users(skillex_score DESC);
CREATE INDEX idx_exchanges_requester    ON exchanges(requester_id);
CREATE INDEX idx_exchanges_receiver     ON exchanges(receiver_id);
CREATE INDEX idx_exchanges_status       ON exchanges(status);
CREATE INDEX idx_sessions_teacher       ON sessions(teacher_id);
CREATE INDEX idx_sessions_learner       ON sessions(learner_id);
CREATE INDEX idx_sessions_scheduled     ON sessions(scheduled_at);
CREATE INDEX idx_reviews_to_user        ON reviews(to_user);
CREATE INDEX idx_discussions_author     ON discussions(author_id);
CREATE INDEX idx_discussions_pinned     ON discussions(is_pinned);
