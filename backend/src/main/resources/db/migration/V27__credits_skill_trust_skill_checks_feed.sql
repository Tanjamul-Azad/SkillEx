ALTER TABLE exchanges
    ADD COLUMN exchange_mode VARCHAR(30) NOT NULL DEFAULT 'DIRECT_SWAP',
    ADD COLUMN credit_cost INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_credit_wallets (
    user_id VARCHAR(36) NOT NULL PRIMARY KEY,
    balance INT NOT NULL DEFAULT 20,
    lifetime_earned INT NOT NULL DEFAULT 20,
    lifetime_spent INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_credit_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS credit_transactions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    counterparty_user_id VARCHAR(36),
    exchange_id VARCHAR(36),
    amount INT NOT NULL,
    transaction_type VARCHAR(40) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_credit_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_transactions_counterparty FOREIGN KEY (counterparty_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_credit_transactions_exchange FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE SET NULL,
    INDEX idx_credit_transactions_user_created (user_id, created_at),
    INDEX idx_credit_transactions_exchange (exchange_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_trust_scores (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    skill_id VARCHAR(36) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    proof_score INT NOT NULL DEFAULT 0,
    session_score INT NOT NULL DEFAULT 0,
    review_score INT NOT NULL DEFAULT 0,
    skill_check_score INT NOT NULL DEFAULT 0,
    safety_score INT NOT NULL DEFAULT 100,
    admin_verified BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_trust_scores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_trust_scores_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY uk_skill_trust_user_skill (user_id, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_check_meetings (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    requester_id VARCHAR(36) NOT NULL,
    target_user_id VARCHAR(36) NOT NULL,
    skill_id VARCHAR(36) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    checklist_intro BOOLEAN NOT NULL DEFAULT FALSE,
    checklist_demo BOOLEAN NOT NULL DEFAULT FALSE,
    checklist_goal_alignment BOOLEAN NOT NULL DEFAULT FALSE,
    checklist_schedule_fit BOOLEAN NOT NULL DEFAULT FALSE,
    message VARCHAR(1000),
    scheduled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_check_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_check_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_check_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    INDEX idx_skill_check_target_status (target_user_id, status),
    INDEX idx_skill_check_requester_status (requester_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skill_check_feedback (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36) NOT NULL,
    target_user_id VARCHAR(36) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    comment VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_check_feedback_meeting FOREIGN KEY (meeting_id) REFERENCES skill_check_meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_check_feedback_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_check_feedback_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_skill_check_feedback_reviewer (meeting_id, reviewer_id),
    INDEX idx_skill_check_feedback_target (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feed_preferences (
    user_id VARCHAR(36) NOT NULL PRIMARY KEY,
    default_mode VARCHAR(30) NOT NULL DEFAULT 'for-you',
    preferred_skill_id VARCHAR(36),
    include_random BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_feed_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_feed_preferences_skill FOREIGN KEY (preferred_skill_id) REFERENCES skills(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
