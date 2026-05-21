-- ─────────────────────────────────────────────────────────────────
-- SkillEX – Migration V22: Real-Time Session Room Persistence
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE session_transcripts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  speaker_user_id VARCHAR(36) NOT NULL,
  speaker_role ENUM('TEACHER', 'LEARNER') NOT NULL,
  content TEXT NOT NULL,
  spoken_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (speaker_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_notes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL UNIQUE,
  key_concepts TEXT,
  action_items TEXT,
  resources_mentioned TEXT,
  summary TEXT,
  raw_transcript TEXT,
  generated_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
