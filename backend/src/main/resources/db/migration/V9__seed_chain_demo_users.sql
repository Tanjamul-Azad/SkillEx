-- ============================================================
-- SkillEX  V9 — Chain Demo Users
-- Seeds 5 users whose skill assignments form guaranteed exchange
-- cycles so the cycle-detection algorithm always has visible demo
-- results:
--
--  3-WAY CYCLE  (A → B → C → A):
--    Arjun  Patel   offers Python,        wants UI/UX Design
--    Bella  Rahman  offers UI/UX Design,  wants Digital Marketing
--    Carlos Rivera  offers Digital Marketing, wants Python
--
--  2-WAY SWAP  (D ↔ E):
--    Dev   Sharma  offers Web Development, wants Data Science
--    Eva   Hossain offers Data Science,    wants Web Development
--
-- Uses INSERT IGNORE so re-running the migration is safe.
-- Skill IDs are looked up by name (subquery pattern from V7).
-- Password hash = BCrypt("SkiilEX@demo2026") — demo users only.
-- ============================================================

-- ── Demo users ───────────────────────────────────────────────
INSERT IGNORE INTO users
  (id, name, email, password_hash, university, bio,
   skillex_score, level, sessions_completed, rating, is_online, role)
VALUES
  ('dc-arjun-001',
   'Arjun Patel',
   'arjun.patel@chain.demo',
   '$2a$10$slYQmyNdgzCbAAEqRCHyiuuBgP1YNy7nBWN.66HPo65ixcETU9dxq',
   'BUET',
   'Python developer keen to master UI/UX design.',
   520, 'PRACTITIONER', 6, 4.20, 0, 'STUDENT'),

  ('dc-bella-001',
   'Bella Rahman',
   'bella.rahman@chain.demo',
   '$2a$10$slYQmyNdgzCbAAEqRCHyiuuBgP1YNy7nBWN.66HPo65ixcETU9dxq',
   'NSU',
   'UI/UX designer exploring digital marketing.',
   585, 'SKILLED', 9, 4.50, 1, 'STUDENT'),

  ('dc-carlos-001',
   'Carlos Rivera',
   'carlos.rivera@chain.demo',
   '$2a$10$slYQmyNdgzCbAAEqRCHyiuuBgP1YNy7nBWN.66HPo65ixcETU9dxq',
   'DIU',
   'Marketing expert who wants to automate everything with Python.',
   490, 'PRACTITIONER', 5, 4.00, 0, 'STUDENT'),

  ('dc-dev-001',
   'Dev Sharma',
   'dev.sharma@chain.demo',
   '$2a$10$slYQmyNdgzCbAAEqRCHyiuuBgP1YNy7nBWN.66HPo65ixcETU9dxq',
   'DU',
   'Full-stack web developer diving into data science.',
   435, 'LEARNER', 3, 3.80, 1, 'STUDENT'),

  ('dc-eva-001',
   'Eva Hossain',
   'eva.hossain@chain.demo',
   '$2a$10$slYQmyNdgzCbAAEqRCHyiuuBgP1YNy7nBWN.66HPo65ixcETU9dxq',
   'SUST',
   'Data scientist learning front-end and web development.',
   385, 'LEARNER', 2, 4.10, 0, 'STUDENT');

-- ── 3-WAY CYCLE: offered skills ──────────────────────────────
-- Arjun offers Python
INSERT IGNORE INTO user_skills_offered (user_id, skill_id, level)
SELECT 'dc-arjun-001', s.id, 'EXPERT'
FROM skills s WHERE s.name = 'Python' LIMIT 1;

-- Bella offers UI/UX Design
INSERT IGNORE INTO user_skills_offered (user_id, skill_id, level)
SELECT 'dc-bella-001', s.id, 'EXPERT'
FROM skills s WHERE s.name = 'UI/UX Design' LIMIT 1;

-- Carlos offers Digital Marketing
INSERT IGNORE INTO user_skills_offered (user_id, skill_id, level)
SELECT 'dc-carlos-001', s.id, 'EXPERT'
FROM skills s WHERE s.name = 'Digital Marketing' LIMIT 1;

-- ── 3-WAY CYCLE: wanted skills ───────────────────────────────
-- Arjun wants UI/UX Design (from Bella)
INSERT IGNORE INTO user_skills_wanted (user_id, skill_id, level)
SELECT 'dc-arjun-001', s.id, 'BEGINNER'
FROM skills s WHERE s.name = 'UI/UX Design' LIMIT 1;

-- Bella wants Digital Marketing (from Carlos)
INSERT IGNORE INTO user_skills_wanted (user_id, skill_id, level)
SELECT 'dc-bella-001', s.id, 'BEGINNER'
FROM skills s WHERE s.name = 'Digital Marketing' LIMIT 1;

-- Carlos wants Python (from Arjun) — closes the ring
INSERT IGNORE INTO user_skills_wanted (user_id, skill_id, level)
SELECT 'dc-carlos-001', s.id, 'BEGINNER'
FROM skills s WHERE s.name = 'Python' LIMIT 1;

-- ── 2-WAY SWAP: offered skills ───────────────────────────────
-- Dev offers Web Development
INSERT IGNORE INTO user_skills_offered (user_id, skill_id, level)
SELECT 'dc-dev-001', s.id, 'MODERATE'
FROM skills s WHERE s.name = 'Web Development' LIMIT 1;

-- Eva offers Data Science
INSERT IGNORE INTO user_skills_offered (user_id, skill_id, level)
SELECT 'dc-eva-001', s.id, 'MODERATE'
FROM skills s WHERE s.name = 'Data Science' LIMIT 1;

-- ── 2-WAY SWAP: wanted skills ────────────────────────────────
-- Dev wants Data Science (from Eva)
INSERT IGNORE INTO user_skills_wanted (user_id, skill_id, level)
SELECT 'dc-dev-001', s.id, 'BEGINNER'
FROM skills s WHERE s.name = 'Data Science' LIMIT 1;

-- Eva wants Web Development (from Dev) — closes the 2-way ring
INSERT IGNORE INTO user_skills_wanted (user_id, skill_id, level)
SELECT 'dc-eva-001', s.id, 'BEGINNER'
FROM skills s WHERE s.name = 'Web Development' LIMIT 1;
