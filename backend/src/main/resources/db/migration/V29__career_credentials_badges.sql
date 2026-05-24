ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE user_credit_wallets
    ADD COLUMN starter_grant_released BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS skill_certificates (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    skill_id VARCHAR(36) NOT NULL,
    certificate_type VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    level_label VARCHAR(60) NOT NULL,
    trust_score_snapshot INT NOT NULL DEFAULT 0,
    session_count_snapshot INT NOT NULL DEFAULT 0,
    average_rating_snapshot DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    verification_code VARCHAR(80) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    revoked_reason VARCHAR(500),
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_certificates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_certificates_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY uk_skill_certificate_user_skill_type (user_id, skill_id, certificate_type),
    INDEX idx_skill_certificates_user_status (user_id, status),
    INDEX idx_skill_certificates_code (verification_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS badge_definitions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(60) NOT NULL,
    revocable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_badges (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    badge_code VARCHAR(80) NOT NULL,
    skill_id VARCHAR(36),
    source_type VARCHAR(80),
    source_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_badge_skill (user_id, badge_code, skill_id),
    INDEX idx_user_badges_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificate_events (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    certificate_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_certificate_events_certificate FOREIGN KEY (certificate_id) REFERENCES skill_certificates(id) ON DELETE CASCADE,
    INDEX idx_certificate_events_certificate (certificate_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE posts
    ADD COLUMN credit_rewarded BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'FAST_RESPONDER', 'Fast Responder', 'Replies quickly and keeps exchanges moving.', 'Zap', 'RELIABILITY', TRUE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'FAST_RESPONDER');

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'RELIABLE_MENTOR', 'Reliable Mentor', 'Completes sessions consistently with strong feedback.', 'CalendarCheck', 'MENTORING', TRUE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'RELIABLE_MENTOR');

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'SKILL_PROOF_UPLOADED', 'Skill Proof Uploaded', 'Added proof for a teachable skill.', 'BadgeCheck', 'PROOF', TRUE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'SKILL_PROOF_UPLOADED');

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'TOP_RATED_TEACHER', 'Top Rated Teacher', 'Earned strong skill-specific learner reviews.', 'Star', 'MENTORING', TRUE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'TOP_RATED_TEACHER');

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'COMMUNITY_HELPER', 'Community Helper', 'Helped others through valuable community contributions.', 'MessagesSquare', 'COMMUNITY', TRUE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'COMMUNITY_HELPER');

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'VERIFIED_SKILL', 'Verified Skill', 'Skill has been verified by platform signals or admin review.', 'ShieldCheck', 'PROOF', TRUE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'VERIFIED_SKILL');

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'TRUSTED_MENTOR', 'Trusted Mentor', 'Reached trusted mentor level for a skill.', 'Award', 'CERTIFICATE', TRUE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'TRUSTED_MENTOR');

INSERT INTO badge_definitions (id, code, name, description, icon, category, revocable)
SELECT UUID(), 'CREDIT_EARNER', 'Credit Earner', 'Earned credits by contributing to the SkillEX economy.', 'Coins', 'CREDITS', FALSE
WHERE NOT EXISTS (SELECT 1 FROM badge_definitions WHERE code = 'CREDIT_EARNER');
