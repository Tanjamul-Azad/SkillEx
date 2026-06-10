-- Skill assessments: AI-graded quizzes for credible certificates
CREATE TABLE skill_assessments (
    id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    user_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    skill_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    difficulty VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, EXPIRED
    questions JSON NOT NULL, -- Array of quiz questions
    score INT,
    proficiency_level VARCHAR(20),
    feedback TEXT,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT,
    INDEX idx_user_skill (user_id, skill_id),
    INDEX idx_completed (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assessment responses (user answers)
CREATE TABLE assessment_responses (
    id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    assessment_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    question_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES skill_assessments(id) ON DELETE CASCADE,
    INDEX idx_assessment (assessment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
