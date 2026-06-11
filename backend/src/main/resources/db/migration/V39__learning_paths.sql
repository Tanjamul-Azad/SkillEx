-- Learning paths: AI-generated, personalized curricula
CREATE TABLE learning_paths (
    id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    user_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    goal_skill_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    target_level VARCHAR(30) NOT NULL,
    total_estimated_hours INT NOT NULL DEFAULT 20,
    completed_steps INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    estimated_completion_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_skill_id) REFERENCES skills(id) ON DELETE RESTRICT,
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_goal (user_id, goal_skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual steps within a learning path (skill + mentor + session)
CREATE TABLE learning_path_steps (
    id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    learning_path_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    skill_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    mentor_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    step_order INT NOT NULL,
    estimated_hours INT NOT NULL,
    description VARCHAR(500),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_session_at DATETIME,
    session_id VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
    INDEX idx_path_order (learning_path_id, step_order),
    INDEX idx_mentor (mentor_id),
    UNIQUE KEY uk_path_order (learning_path_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
