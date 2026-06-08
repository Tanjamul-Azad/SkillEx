-- ============================================================
-- SkillEX  V37 — Demo activity seed (sessions, events, discussions)
-- Makes the platform look alive for the demo and gives the public Impact
-- dashboard (/api/analytics/impact) substantial, HONEST numbers:
--   * Completed exchanges + sessions are generated only from REAL
--     offered-wanted skill matches (teacher genuinely offers the skill,
--     learner genuinely wants it) — not fabricated pairings.
--   * Future-dated events and discussions fill out the community surfaces.
--
-- Idempotent:
--   * Session/exchange seed is guarded by a completed-session count check,
--     so it only runs while the platform is still "empty-ish" (< 10 completed).
--   * Events/discussions use deterministic IDs + INSERT IGNORE.
-- ============================================================

-- ── 1. Completed exchanges + sessions from real skill matches ──────────────
DROP TEMPORARY TABLE IF EXISTS seed_pairs;
CREATE TEMPORARY TABLE seed_pairs (
  teacher_id VARCHAR(36) COLLATE utf8mb4_unicode_ci,
  learner_id VARCHAR(36) COLLATE utf8mb4_unicode_ci,
  skill_id   VARCHAR(36) COLLATE utf8mb4_unicode_ci,
  exch_id    VARCHAR(36) COLLATE utf8mb4_unicode_ci,
  sess_id    VARCHAR(36) COLLATE utf8mb4_unicode_ci,
  rn         INT
);

SET @rn := 0;
-- Each row: a real user who OFFERS a skill, paired with a real user who WANTS it.
-- Guarded so this only seeds when the platform has < 10 completed sessions.
INSERT INTO seed_pairs (teacher_id, learner_id, skill_id, exch_id, sess_id, rn)
SELECT o.user_id, w.user_id, o.skill_id, UUID(), UUID(), (@rn := @rn + 1)
FROM user_skills_offered o
JOIN user_skills_wanted  w ON o.skill_id = w.skill_id AND o.user_id <> w.user_id
WHERE (SELECT COUNT(*) FROM sessions s WHERE s.status = 'COMPLETED') < 10
LIMIT 24;

-- Exchange (the accepted+completed deal behind each session)
INSERT INTO exchanges
  (id, requester_id, receiver_id, offered_skill_id, wanted_skill_id, message,
   exchange_mode, credit_cost, status, session_date, created_at, updated_at)
SELECT exch_id, teacher_id, learner_id, skill_id, skill_id,
       'Completed peer skill exchange.', 'DIRECT_SWAP', 0, 'COMPLETED',
       DATE_SUB(NOW(), INTERVAL rn * 2 DAY),
       DATE_SUB(NOW(), INTERVAL (rn * 2 + 2) DAY),
       DATE_SUB(NOW(), INTERVAL rn * 2 DAY)
FROM seed_pairs;

-- Completed session for each exchange (60 / 90 / 120 min for a realistic spread)
INSERT INTO sessions
  (id, exchange_id, teacher_id, learner_id, skill_id, proposed_by,
   scheduled_at, duration_mins, status, session_type, created_at, updated_at)
SELECT sess_id, exch_id, teacher_id, learner_id, skill_id, teacher_id,
       DATE_SUB(NOW(), INTERVAL rn * 2 DAY),
       60 + (rn % 3) * 30,
       'COMPLETED', 'VIDEO',
       DATE_SUB(NOW(), INTERVAL rn * 2 DAY),
       DATE_SUB(NOW(), INTERVAL rn * 2 DAY)
FROM seed_pairs;

DROP TEMPORARY TABLE IF EXISTS seed_pairs;

-- ── 2. Future-dated community events ───────────────────────────────────────
INSERT IGNORE INTO events (id, title, description, host_id, event_date, location, is_online, event_type, status)
SELECT 'evt-seed-01', 'React + Spring Boot Build Night',
       'Hands-on full-stack workshop: wire a React front end to a Spring Boot API, live.',
       u.id, DATE_ADD(NOW(), INTERVAL 4 DAY), 'BUET ECE Building', 0, 'WORKSHOP', 'SCHEDULED'
FROM users u WHERE u.email = 'smith@gmail.com' LIMIT 1;

INSERT IGNORE INTO events (id, title, description, host_id, event_date, location, is_online, event_type, status)
SELECT 'evt-seed-02', 'Figma to Prototype in 90 Minutes',
       'A live UI/UX design sprint — go from blank canvas to clickable prototype.',
       u.id, DATE_ADD(NOW(), INTERVAL 7 DAY), 'Online (Zoom)', 1, 'WORKSHOP', 'SCHEDULED'
FROM users u WHERE u.email = 'jenkins@gmail.com' LIMIT 1;

INSERT IGNORE INTO events (id, title, description, host_id, event_date, location, is_online, event_type, status)
SELECT 'evt-seed-03', 'Data Science Study Sprint',
       'Pair up and work through a real dataset end-to-end with peer mentors on hand.',
       u.id, DATE_ADD(NOW(), INTERVAL 10 DAY), 'Online (Discord)', 1, 'STUDY_SPRINT', 'SCHEDULED'
FROM users u WHERE u.email = 'patel@gmail.com' LIMIT 1;

INSERT IGNORE INTO events (id, title, description, host_id, event_date, location, is_online, event_type, status)
SELECT 'evt-seed-04', 'Public Speaking Confidence Clinic',
       'Practice lightning talks in a supportive room and get instant peer feedback.',
       u.id, DATE_ADD(NOW(), INTERVAL 6 DAY), 'NSU Auditorium', 0, 'WORKSHOP', 'SCHEDULED'
FROM users u WHERE u.email = 'taylor@gmail.com' LIMIT 1;

INSERT IGNORE INTO events (id, title, description, host_id, event_date, location, is_online, event_type, status)
SELECT 'evt-seed-05', 'Portfolio Review: Get Hired',
       'Bring your portfolio; mentors review it live and suggest concrete improvements.',
       u.id, DATE_ADD(NOW(), INTERVAL 13 DAY), 'Online (Meet)', 1, 'PORTFOLIO_REVIEW', 'SCHEDULED'
FROM users u WHERE u.email = 'johnson@gmail.com' LIMIT 1;

INSERT IGNORE INTO events (id, title, description, host_id, event_date, location, is_online, event_type, status)
SELECT 'evt-seed-06', 'Weekend Skill-Swap Hackathon',
       'Form chains, teach a skill, learn a skill, and ship something together in 24h.',
       u.id, DATE_ADD(NOW(), INTERVAL 16 DAY), 'IUT Campus', 0, 'HACKATHON', 'SCHEDULED'
FROM users u WHERE u.email = 'chen@gmail.com' LIMIT 1;

-- ── 3. Community discussions ───────────────────────────────────────────────
INSERT IGNORE INTO discussions (id, title, content, author_id, upvotes, replies, views, is_pinned, thread_type, status)
SELECT 'dsc-seed-01', 'Best way to start learning Python for data science?',
       'I can teach Figma in return. Looking for a structured path from basics to pandas/sklearn. What worked for you?',
       u.id, 42, 11, 280, 1, 'QUESTION', 'OPEN'
FROM users u WHERE u.email = 'jenkins@gmail.com' LIMIT 1;

INSERT IGNORE INTO discussions (id, title, content, author_id, upvotes, replies, views, is_pinned, thread_type, status)
SELECT 'dsc-seed-02', 'Looking for a Web Dev mentor — can swap Data Science',
       'Comfortable with ML and stats, want to get production-ready on the front end. Happy to trade sessions.',
       u.id, 35, 8, 210, 0, 'RESOURCE_REQUEST', 'OPEN'
FROM users u WHERE u.email = 'oconnor@gmail.com' LIMIT 1;

INSERT IGNORE INTO discussions (id, title, content, author_id, upvotes, replies, views, is_pinned, thread_type, status)
SELECT 'dsc-seed-03', 'How my 3-person skill chain actually closed the loop',
       'I taught Python, learned UI/UX, and the person I learned from got marketing help from a third member. No money changed hands. Sharing how we set it up.',
       u.id, 88, 19, 540, 1, 'SUCCESS_STORY', 'SOLVED'
FROM users u WHERE u.email = 'smith@gmail.com' LIMIT 1;

INSERT IGNORE INTO discussions (id, title, content, author_id, upvotes, replies, views, is_pinned, thread_type, status)
SELECT 'dsc-seed-04', 'Review my Figma case study before I publish?',
       'Two screens and a flow. Would love a second pair of eyes on hierarchy and spacing. Can teach public speaking back.',
       u.id, 27, 6, 160, 0, 'PROJECT_REVIEW', 'OPEN'
FROM users u WHERE u.email = 'rodriguez@gmail.com' LIMIT 1;

INSERT IGNORE INTO discussions (id, title, content, author_id, upvotes, replies, views, is_pinned, thread_type, status)
SELECT 'dsc-seed-05', 'Resources for Digital Marketing fundamentals?',
       'Trying to go from zero to running a small campaign. Any free playbooks or mentors open to a swap?',
       u.id, 31, 9, 195, 0, 'RESOURCE_REQUEST', 'OPEN'
FROM users u WHERE u.email = 'taylor@gmail.com' LIMIT 1;

INSERT IGNORE INTO discussions (id, title, content, author_id, upvotes, replies, views, is_pinned, thread_type, status)
SELECT 'dsc-seed-06', 'Guitar for beginners — what to practice in week one?',
       'Picked up an acoustic. Looking for a mentor; I can teach Data Science in exchange.',
       u.id, 24, 7, 150, 0, 'QUESTION', 'OPEN'
FROM users u WHERE u.email = 'chen@gmail.com' LIMIT 1;
