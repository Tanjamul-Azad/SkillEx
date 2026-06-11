-- Migration: Create tutor_bot_conversations table
-- Version: V39
-- Description: Store AI Tutor Bot conversations per user-skill pair

CREATE TABLE IF NOT EXISTS tutor_bot_conversations (
    id VARCHAR(36) PRIMARY KEY NOT NULL COMMENT 'UUID primary key',
    user_id VARCHAR(36) NOT NULL COMMENT 'Foreign key to users table',
    skill_id VARCHAR(36) NOT NULL COMMENT 'Foreign key to skills table',
    messages_json LONGTEXT NOT NULL COMMENT 'Serialized JSON array of TutorMessageDto objects',
    total_questions_asked INT NOT NULL DEFAULT 0 COMMENT 'Total quiz questions asked in this conversation',
    questions_answered_correctly INT NOT NULL DEFAULT 0 COMMENT 'Number of quiz questions answered correctly',
    accuracy_percentage DOUBLE COMMENT 'Quiz accuracy percentage (0-100)',
    active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether this conversation is currently active',
    created_at TIMESTAMP NOT NULL COMMENT 'Conversation creation timestamp',
    last_interaction_at TIMESTAMP NULL COMMENT 'Last message timestamp',

    CONSTRAINT fk_tutor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tutor_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_skill (user_id, skill_id) COMMENT 'One conversation per user per skill',
    INDEX idx_user_skill (user_id, skill_id) COMMENT 'Fast lookup by user and skill',
    INDEX idx_user_id (user_id) COMMENT 'Fast lookup of all conversations for user',
    INDEX idx_last_interaction (last_interaction_at) COMMENT 'For ordering by recent activity'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='AI Tutor Bot conversation history and stats per user-skill pair';
