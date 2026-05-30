CREATE TABLE IF NOT EXISTS user_progress (
    user_id VARCHAR(36) NOT NULL,
    total_xp INT NOT NULL DEFAULT 0,
    current_level INT NOT NULL DEFAULT 1,
    current_streak_days INT NOT NULL DEFAULT 0,
    longest_streak_days INT NOT NULL DEFAULT 0,
    weekly_goal INT NOT NULL DEFAULT 3,
    last_activity_date DATE NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS xp_events (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    source_type VARCHAR(60) NOT NULL,
    source_id VARCHAR(120) NOT NULL,
    xp_delta INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_xp_events_source (user_id, source_type, source_id),
    INDEX idx_xp_events_user_time (user_id, occurred_at),
    CONSTRAINT fk_xp_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_proofs (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    skill_id VARCHAR(36) NULL,
    title VARCHAR(140) NOT NULL,
    description TEXT NULL,
    proof_type VARCHAR(40) NOT NULL,
    url VARCHAR(600) NULL,
    media_url VARCHAR(600) NULL,
    source_session_id VARCHAR(36) NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_portfolio_proofs_user_created (user_id, created_at),
    INDEX idx_portfolio_proofs_user_featured (user_id, featured),
    CONSTRAINT fk_portfolio_proofs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_portfolio_proofs_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
    CONSTRAINT fk_portfolio_proofs_session FOREIGN KEY (source_session_id) REFERENCES sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
