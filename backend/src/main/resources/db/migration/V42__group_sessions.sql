-- Group sessions: one mentor teaches many learners (workshop format)
CREATE TABLE group_sessions (
    id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    mentor_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    skill_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(1000),
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    max_attendees INT NOT NULL DEFAULT 10,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    shared_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT,
    INDEX idx_group_status_scheduled (status, scheduled_at),
    INDEX idx_group_mentor (mentor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendees enrolled in a group session
CREATE TABLE group_session_attendees (
    id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    group_session_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    user_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    certificate_earned BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_group_attendee (group_session_id, user_id),
    INDEX idx_attendee_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
