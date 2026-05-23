-- ============================================================
-- SkillEX V23 — Create Feedbacks Table
-- Creates a global system for registered users to leave platform
-- feedback and seeds authentic initial feedback entries from demo users.
-- ============================================================

CREATE TABLE feedbacks (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed dynamic realistic feedbacks from chain demo users
INSERT INTO feedbacks (id, user_id, rating, comment, created_at) VALUES
('fb-001', 'dc-bella-001', 5, 'SkiilEX has completely changed how I think about learning. I traded Figma lessons for music production sessions. Everyone wins, no one pays!', NOW() - INTERVAL 5 DAY),
('fb-002', 'dc-arjun-001', 5, 'This platform is a game-changer. I learned Python from a senior without spending a single taka. The AI matching is super intuitive and accurate!', NOW() - INTERVAL 3 DAY),
('fb-003', 'dc-carlos-001', 5, 'I was struggling with public speaking, but through SkiilEX I found a practice partner who is now a close friend. It boosted my confidence immensely!', NOW() - INTERVAL 1 DAY);
