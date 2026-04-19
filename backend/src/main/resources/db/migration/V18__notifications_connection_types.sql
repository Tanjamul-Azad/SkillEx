-- ============================================================
-- SkillEX V18 — Expand notification type enum for connections
-- Ensures CONNECTION_REQUEST and CONNECTION_ACCEPTED can be stored.
-- ============================================================

ALTER TABLE notifications
  MODIFY COLUMN type ENUM(
    'MATCH_REQUEST',
    'CONNECTION_REQUEST',
    'CONNECTION_ACCEPTED',
    'SESSION_SCHEDULED',
    'REVIEW_LEFT',
    'SYSTEM_UPDATE'
  ) NOT NULL;
