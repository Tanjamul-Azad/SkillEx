-- SkillEX community workspace MVP: event RSVP metadata, circle resources,
-- discussion replies, and notification deep links.

ALTER TABLE skill_circles
  ADD COLUMN description TEXT NULL,
  ADD COLUMN owner_id VARCHAR(36) NULL,
  ADD CONSTRAINT fk_skill_circles_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE events
  ADD COLUMN event_type ENUM('ANNOUNCEMENT','WORKSHOP','STUDY_SPRINT','OFFICE_HOUR','HACKATHON','PORTFOLIO_REVIEW') NOT NULL DEFAULT 'WORKSHOP',
  ADD COLUMN circle_id VARCHAR(36) NULL,
  ADD COLUMN meeting_url VARCHAR(500) NULL,
  ADD COLUMN status ENUM('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  ADD CONSTRAINT fk_events_circle FOREIGN KEY (circle_id) REFERENCES skill_circles(id) ON DELETE SET NULL;

CREATE INDEX idx_events_circle_date ON events(circle_id, event_date);
CREATE INDEX idx_events_type_date ON events(event_type, event_date);

CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  state ENUM('INTERESTED','GOING','NOT_GOING') NOT NULL DEFAULT 'INTERESTED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT fk_event_rsvps_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_rsvps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO event_rsvps (event_id, user_id, state)
SELECT event_id, user_id, 'GOING'
FROM event_attendees;

ALTER TABLE discussions
  ADD COLUMN thread_type ENUM('QUESTION','RESOURCE_REQUEST','PROJECT_REVIEW','SUCCESS_STORY','ANNOUNCEMENT') NOT NULL DEFAULT 'QUESTION',
  ADD COLUMN skill_id VARCHAR(36) NULL,
  ADD COLUMN circle_id VARCHAR(36) NULL,
  ADD COLUMN status ENUM('OPEN','SOLVED') NOT NULL DEFAULT 'OPEN',
  ADD COLUMN accepted_reply_id VARCHAR(36) NULL,
  ADD CONSTRAINT fk_discussions_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_discussions_circle FOREIGN KEY (circle_id) REFERENCES skill_circles(id) ON DELETE SET NULL;

CREATE INDEX idx_discussions_circle_status ON discussions(circle_id, status);
CREATE INDEX idx_discussions_thread_status ON discussions(thread_type, status);
CREATE INDEX idx_discussions_skill_status ON discussions(skill_id, status);

CREATE TABLE IF NOT EXISTS discussion_replies (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  discussion_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  is_accepted TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_discussion_replies_discussion FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
  CONSTRAINT fk_discussion_replies_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE discussions
  ADD CONSTRAINT fk_discussions_accepted_reply FOREIGN KEY (accepted_reply_id) REFERENCES discussion_replies(id) ON DELETE SET NULL;

CREATE INDEX idx_discussion_replies_discussion ON discussion_replies(discussion_id, created_at);

CREATE TABLE IF NOT EXISTS skill_circle_resources (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  circle_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NULL,
  resource_type ENUM('LINK','FILE','NOTE') NOT NULL DEFAULT 'LINK',
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) NULL,
  notes TEXT NULL,
  difficulty ENUM('BEGINNER','MODERATE','ADVANCED') NOT NULL DEFAULT 'BEGINNER',
  upvotes INT NOT NULL DEFAULT 0,
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_circle_resources_circle FOREIGN KEY (circle_id) REFERENCES skill_circles(id) ON DELETE CASCADE,
  CONSTRAINT fk_circle_resources_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_circle_resources_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_circle_resources_circle ON skill_circle_resources(circle_id, is_pinned, created_at);
CREATE INDEX idx_circle_resources_skill ON skill_circle_resources(skill_id);

ALTER TABLE notifications
  MODIFY COLUMN type ENUM('MATCH_REQUEST','CONNECTION_REQUEST','CONNECTION_ACCEPTED','SESSION_SCHEDULED','REVIEW_LEFT','SYSTEM_UPDATE','COMMUNITY_EVENT','CIRCLE_ACTIVITY','DISCUSSION_REPLY') NOT NULL,
  ADD COLUMN target_type VARCHAR(40) NULL,
  ADD COLUMN target_id VARCHAR(36) NULL,
  ADD COLUMN action_url VARCHAR(500) NULL;

CREATE INDEX idx_notifications_target ON notifications(target_type, target_id);
