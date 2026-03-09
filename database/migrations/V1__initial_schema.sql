-- ============================================================
-- SkillEX — MySQL Initial Schema
-- Compatible with: MySQL 8.0+ / MariaDB 10.6+
-- Run against Spring Boot DataSource (managed by Flyway or Liquibase)
-- ============================================================

CREATE DATABASE IF NOT EXISTS skillex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skillex;

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
  level               ENUM('Newcomer','Learner','Practitioner','Skilled','Advanced','Master')
                                    NOT NULL DEFAULT 'Newcomer',
  sessions_completed  INT           NOT NULL DEFAULT 0,
  rating              DECIMAL(3,2)  NOT NULL DEFAULT 0.00       COMMENT 'Average review rating (0–5)',
  is_online           TINYINT(1)    NOT NULL DEFAULT 0,
  role                ENUM('student','admin')
                                    NOT NULL DEFAULT 'student',
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
  level       ENUM('beginner','moderate','expert') NOT NULL DEFAULT 'beginner',
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT fk_uso_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_uso_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── user_skills_wanted ───────────────────────────────────────
-- Skills a user wants to learn. Spring Boot: @ManyToMany UserSkillWanted.java
CREATE TABLE IF NOT EXISTS user_skills_wanted (
  user_id     VARCHAR(36)   NOT NULL,
  skill_id    VARCHAR(36)   NOT NULL,
  level       ENUM('beginner','moderate','expert') NOT NULL DEFAULT 'beginner',
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
  status           ENUM('pending','accepted','declined','completed','cancelled')
                                 NOT NULL DEFAULT 'pending',
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
  status          ENUM('scheduled','completed','cancelled')
                                NOT NULL DEFAULT 'scheduled',
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
  activity      ENUM('🔥 Very Active','⚡ Active','😴 Quiet') NOT NULL DEFAULT '⚡ Active',
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

-- ── posts ─────────────────────────────────────────────────────
-- Feed posts. Spring Boot entity: Post.java
CREATE TABLE IF NOT EXISTS posts (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  author_id   VARCHAR(36)   NOT NULL,
  type        ENUM('SHOWCASE','ACHIEVEMENT','EXCHANGE','QUESTION') NOT NULL DEFAULT 'EXCHANGE',
  content     TEXT          NOT NULL,
  skill_id    VARCHAR(36)   DEFAULT NULL,
  badge       VARCHAR(100)  DEFAULT NULL,
  likes       INT           NOT NULL DEFAULT 0,
  comments    INT           NOT NULL DEFAULT 0,
  shares      INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_p_author FOREIGN KEY (author_id) REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_p_skill  FOREIGN KEY (skill_id)  REFERENCES skills(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── stories ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)   NOT NULL,
  content     TEXT          DEFAULT NULL,
  image_url   VARCHAR(500)  DEFAULT NULL,
  is_seen     TINYINT(1)    NOT NULL DEFAULT 0,
  expires_at  DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_st_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)   NOT NULL                COMMENT 'Recipient',
  type        VARCHAR(50)   NOT NULL                COMMENT 'exchange_request | message | review | system',
  title       VARCHAR(200)  NOT NULL,
  message     TEXT          DEFAULT NULL,
  is_read     TINYINT(1)    NOT NULL DEFAULT 0,
  link        VARCHAR(500)  DEFAULT NULL            COMMENT 'Deep-link URL',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_n_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── event_attendees ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_attendees (
  event_id    VARCHAR(36)   NOT NULL,
  user_id     VARCHAR(36)   NOT NULL,
  registered_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT fk_ea_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_ea_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── skill_circle_members ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_circle_members (
  circle_id   VARCHAR(36)   NOT NULL,
  user_id     VARCHAR(36)   NOT NULL,
  joined_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (circle_id, user_id),
  CONSTRAINT fk_scm_circle FOREIGN KEY (circle_id) REFERENCES skill_circles(id) ON DELETE CASCADE,
  CONSTRAINT fk_scm_user   FOREIGN KEY (user_id)   REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_posts_author      ON posts(author_id);
CREATE INDEX idx_stories_user      ON stories(user_id);
CREATE INDEX idx_notif_user        ON notifications(user_id);
CREATE INDEX idx_notif_unread      ON notifications(user_id, is_read);
