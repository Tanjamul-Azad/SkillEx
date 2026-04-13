-- Controlled auto-catalog governance pipeline
-- 1) pending skill intake queue
-- 2) audit trail for submit/review/promotion actions

CREATE TABLE IF NOT EXISTS pending_skills (
  id                  VARCHAR(36) NOT NULL DEFAULT (UUID()),
  normalized_name     VARCHAR(150) NOT NULL,
  display_name        VARCHAR(150) NOT NULL,
  category            VARCHAR(50)  NULL,
  description         VARCHAR(500) NULL,
  source_intent       TEXT         NULL,
  status              ENUM('PENDING','APPROVED','REJECTED','AUTO_PROMOTED') NOT NULL DEFAULT 'PENDING',
  seen_count          INT NOT NULL DEFAULT 1,
  confidence_sum      DOUBLE NOT NULL DEFAULT 0,
  first_seen_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  requested_by_user_id VARCHAR(36) NULL,
  promoted_skill_id   VARCHAR(36) NULL,
  reviewed_by_user_id VARCHAR(36) NULL,
  review_note         VARCHAR(500) NULL,
  reviewed_at         DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pending_skills_normalized_name (normalized_name),
  KEY idx_pending_skills_status_last_seen (status, last_seen_at),
  CONSTRAINT fk_pending_requested_by_user FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pending_reviewed_by_user FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pending_promoted_skill FOREIGN KEY (promoted_skill_id) REFERENCES skills(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_catalog_audit (
  id               VARCHAR(36) NOT NULL DEFAULT (UUID()),
  action           ENUM('SUBMITTED','UPDATED','AUTO_PROMOTED','APPROVED','REJECTED') NOT NULL,
  pending_skill_id VARCHAR(36) NULL,
  skill_id         VARCHAR(36) NULL,
  actor_user_id    VARCHAR(36) NULL,
  details          VARCHAR(500) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_skill_catalog_audit_created_at (created_at),
  CONSTRAINT fk_audit_pending_skill FOREIGN KEY (pending_skill_id) REFERENCES pending_skills(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
