-- Track distinct user suggestions per pending skill for governance auto-promotion.

CREATE TABLE IF NOT EXISTS pending_skill_suggestions (
  id               VARCHAR(36) NOT NULL DEFAULT (UUID()),
  pending_skill_id VARCHAR(36) NOT NULL,
  user_id          VARCHAR(36) NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pending_skill_user (pending_skill_id, user_id),
  KEY idx_pending_skill_suggestions_pending (pending_skill_id),
  KEY idx_pending_skill_suggestions_user (user_id),
  CONSTRAINT fk_pending_skill_suggestions_pending
    FOREIGN KEY (pending_skill_id) REFERENCES pending_skills(id) ON DELETE CASCADE,
  CONSTRAINT fk_pending_skill_suggestions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
