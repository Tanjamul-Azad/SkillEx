-- ============================================================
-- SkillEX V16 — Connections Table
-- Stores user-to-user connection requests and outcomes.
-- ============================================================

CREATE TABLE IF NOT EXISTS connections (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  requester_id  VARCHAR(36)   NOT NULL COMMENT 'User who sent the connection request',
  receiver_id   VARCHAR(36)   NOT NULL COMMENT 'User who received the connection request',
  message       TEXT          DEFAULT NULL COMMENT 'Optional intro note from requester',
  status        ENUM('PENDING','ACCEPTED','DECLINED','CANCELLED')
                            NOT NULL DEFAULT 'PENDING',
  responded_at  DATETIME      DEFAULT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_connections_requester (requester_id),
  KEY idx_connections_receiver (receiver_id),
  KEY idx_connections_status (status),
  KEY idx_connections_created_at (created_at),

  CONSTRAINT fk_conn_requester
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conn_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
