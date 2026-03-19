-- ============================================================
-- SkillEX — Community & Notification Tables  V2
-- ============================================================

-- ── posts ─────────────────────────────────────────────────────
-- Community feed posts. Spring Boot entity: Post.java
CREATE TABLE IF NOT EXISTS posts (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  type        ENUM('SHOWCASE','ACHIEVEMENT','EXCHANGE','QUESTION') NOT NULL DEFAULT 'SHOWCASE',
  author_id   VARCHAR(36)   NOT NULL,
  content     TEXT          NOT NULL,
  skill_id    VARCHAR(36)   DEFAULT NULL  COMMENT 'Optional skill tag',
  badge       VARCHAR(100)  DEFAULT NULL  COMMENT 'Achievement badge label',
  likes       INT           NOT NULL DEFAULT 0,
  comments    INT           NOT NULL DEFAULT 0,
  shares      INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_p_author FOREIGN KEY (author_id) REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_p_skill  FOREIGN KEY (skill_id)  REFERENCES skills(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── stories ───────────────────────────────────────────────────
-- 24-hour user stories. Spring Boot entity: Story.java
CREATE TABLE IF NOT EXISTS stories (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)   NOT NULL,
  is_seen     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_st_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── event_attendees ───────────────────────────────────────────
-- Many-to-many: which users are attending an event
CREATE TABLE IF NOT EXISTS event_attendees (
  event_id  VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT fk_ea_event FOREIGN KEY (event_id) REFERENCES events(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ea_user  FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── skill_circle_members ──────────────────────────────────────
-- Many-to-many: which users belong to a skill circle
CREATE TABLE IF NOT EXISTS skill_circle_members (
  circle_id VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  PRIMARY KEY (circle_id, user_id),
  CONSTRAINT fk_scm_circle FOREIGN KEY (circle_id) REFERENCES skill_circles(id) ON DELETE CASCADE,
  CONSTRAINT fk_scm_user   FOREIGN KEY (user_id)   REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── skill_circle_skills ───────────────────────────────────────
-- Many-to-many: which skills a circle is focused on
CREATE TABLE IF NOT EXISTS skill_circle_skills (
  circle_id VARCHAR(36) NOT NULL,
  skill_id  VARCHAR(36) NOT NULL,
  PRIMARY KEY (circle_id, skill_id),
  CONSTRAINT fk_scs_circle FOREIGN KEY (circle_id) REFERENCES skill_circles(id) ON DELETE CASCADE,
  CONSTRAINT fk_scs_skill  FOREIGN KEY (skill_id)  REFERENCES skills(id)        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── notifications ─────────────────────────────────────────────
-- In-app notifications. Spring Boot entity: Notification.java
CREATE TABLE IF NOT EXISTS notifications (
  id           VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id      VARCHAR(36)   NOT NULL  COMMENT 'Recipient',
  type         ENUM('MATCH_REQUEST','SESSION_SCHEDULED','REVIEW_LEFT','SYSTEM_UPDATE') NOT NULL,
  message      TEXT          NOT NULL,
  from_user_id VARCHAR(36)   DEFAULT NULL COMMENT 'Sender (nullable for system notifications)',
  is_read      TINYINT(1)    NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_n_user      FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_n_from_user FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_posts_author           ON posts(author_id);
CREATE INDEX idx_posts_created          ON posts(created_at DESC);
CREATE INDEX idx_stories_user           ON stories(user_id);
CREATE INDEX idx_notifications_user     ON notifications(user_id);
CREATE INDEX idx_notifications_unread   ON notifications(user_id, is_read);
