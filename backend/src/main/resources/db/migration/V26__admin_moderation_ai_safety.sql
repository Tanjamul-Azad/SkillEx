CREATE TABLE IF NOT EXISTS platform_rules (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    category VARCHAR(60) NOT NULL,
    severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
    default_action ENUM('WARN','HIDE_CONTENT','REMOVE_CONTENT','RESTRICT_POSTING','RESTRICT_MESSAGING','SUSPEND_ACCOUNT','BAN_ACCOUNT','NO_ACTION') NOT NULL DEFAULT 'WARN',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_reports (
    id VARCHAR(36) PRIMARY KEY,
    reporter_user_id VARCHAR(36) NOT NULL,
    target_type ENUM('USER','POST','COMMENT','MESSAGE','PROFILE','SESSION','REVIEW','SKILL','DISCUSSION') NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    target_user_id VARCHAR(36),
    category VARCHAR(80) NOT NULL,
    reason TEXT NOT NULL,
    evidence TEXT,
    status ENUM('OPEN','IN_REVIEW','RESOLVED','DISMISSED') NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_content_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_content_reports_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_reports_status_created (status, created_at),
    INDEX idx_content_reports_target (target_type, target_id),
    INDEX idx_content_reports_target_user (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS moderation_cases (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36),
    assigned_admin_id VARCHAR(36),
    target_user_id VARCHAR(36),
    title VARCHAR(180) NOT NULL,
    summary TEXT,
    severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
    status ENUM('OPEN','IN_REVIEW','RESOLVED','DISMISSED') NOT NULL DEFAULT 'OPEN',
    ai_summary TEXT,
    ai_recommended_action VARCHAR(60),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    CONSTRAINT fk_moderation_cases_report FOREIGN KEY (report_id) REFERENCES content_reports(id) ON DELETE SET NULL,
    CONSTRAINT fk_moderation_cases_admin FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_moderation_cases_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_moderation_cases_status_updated (status, updated_at),
    INDEX idx_moderation_cases_target_user (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS moderation_actions (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36),
    admin_user_id VARCHAR(36) NOT NULL,
    target_user_id VARCHAR(36),
    target_type VARCHAR(40),
    target_id VARCHAR(36),
    action_type ENUM('WARN','HIDE_CONTENT','REMOVE_CONTENT','RESTRICT_POSTING','RESTRICT_MESSAGING','SUSPEND_ACCOUNT','BAN_ACCOUNT','NO_ACTION') NOT NULL,
    severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
    reason TEXT NOT NULL,
    evidence TEXT,
    duration_hours INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_moderation_actions_case FOREIGN KEY (case_id) REFERENCES moderation_cases(id) ON DELETE SET NULL,
    CONSTRAINT fk_moderation_actions_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_moderation_actions_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_moderation_actions_target_user_created (target_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_restrictions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    action_id VARCHAR(36),
    restriction_type ENUM('WARN','RESTRICT_POSTING','RESTRICT_MESSAGING','SUSPEND_ACCOUNT','BAN_ACCOUNT') NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('ACTIVE','EXPIRED','REVOKED') NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_restrictions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_restrictions_action FOREIGN KEY (action_id) REFERENCES moderation_actions(id) ON DELETE SET NULL,
    INDEX idx_user_restrictions_user_status (user_id, status),
    INDEX idx_user_restrictions_ends_at (ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    admin_user_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(36),
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_audit_logs_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin_audit_logs_admin_created (admin_user_id, created_at),
    INDEX idx_admin_audit_logs_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_helper_conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    context_type VARCHAR(60) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_helper_conversations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ai_helper_conversations_user_context (user_id, context_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_rules (id, code, title, description, category, severity, default_action)
SELECT UUID(), 'HARASSMENT', 'Harassment or intimidation', 'Threatening, bullying, or repeated unwanted contact.', 'Safety', 'HIGH', 'SUSPEND_ACCOUNT'
WHERE NOT EXISTS (SELECT 1 FROM platform_rules WHERE code = 'HARASSMENT');

INSERT INTO platform_rules (id, code, title, description, category, severity, default_action)
SELECT UUID(), 'SPAM', 'Spam or platform abuse', 'Repeated low-quality promotion, scams, or bot-like activity.', 'Integrity', 'MEDIUM', 'RESTRICT_POSTING'
WHERE NOT EXISTS (SELECT 1 FROM platform_rules WHERE code = 'SPAM');

INSERT INTO platform_rules (id, code, title, description, category, severity, default_action)
SELECT UUID(), 'FAKE_SKILL', 'Misrepresented skill or identity', 'False profile, fake credentials, or misleading skill proof.', 'Trust', 'MEDIUM', 'WARN'
WHERE NOT EXISTS (SELECT 1 FROM platform_rules WHERE code = 'FAKE_SKILL');

INSERT INTO platform_rules (id, code, title, description, category, severity, default_action)
SELECT UUID(), 'HARMFUL_CONTENT', 'Harmful or illegal content', 'Illegal, hateful, discriminatory, sexual, or dangerous content.', 'Safety', 'CRITICAL', 'BAN_ACCOUNT'
WHERE NOT EXISTS (SELECT 1 FROM platform_rules WHERE code = 'HARMFUL_CONTENT');
