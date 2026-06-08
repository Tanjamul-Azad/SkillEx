-- ============================================================
-- SkillEX  V36 — Demo Skill Certificates (data-driven)
-- Seeds verifiable mentor certificates so the public certificate verification
-- page (/verify/certificate/:code) always has real, impressive data to show.
--
-- Robust by design: instead of depending on specific seeded user IDs (which vary
-- between databases), each certificate is issued to the *highest-rated real user
-- who already offers that skill*. Skills with no offerer simply insert 0 rows.
--
-- Memorable verification codes for the live walkthrough:
--   SKILLEX-PYTHON-2026, SKILLEX-UIUX-2026, SKILLEX-MARKETING-2026,
--   SKILLEX-WEBDEV-2026, SKILLEX-DATASCI-2026
--
-- Idempotent: deterministic primary key (derived from user_id) + unique
-- verification codes + INSERT IGNORE, so re-running is always safe.
-- ============================================================

-- Helper pattern (repeated per skill):
--   pick the top-rated offerer of the named skill and issue them a mentor cert.

-- Python
INSERT IGNORE INTO skill_certificates
  (id, user_id, skill_id, certificate_type, title, level_label,
   trust_score_snapshot, session_count_snapshot, average_rating_snapshot,
   verification_code, status, issued_at)
SELECT CONCAT('cert-demo-python-', uso.user_id), uso.user_id, uso.skill_id, 'TRUSTED_MENTOR',
       'Trusted Python Mentor', 'Trusted Mentor',
       88, GREATEST(u.sessions_completed, 4), GREATEST(u.rating, 4.50),
       'SKILLEX-PYTHON-2026', 'ACTIVE', NOW()
FROM user_skills_offered uso
JOIN skills s ON s.id = uso.skill_id
JOIN users  u ON u.id = uso.user_id
WHERE s.name = 'Python'
ORDER BY u.rating DESC, u.sessions_completed DESC
LIMIT 1;

-- UI/UX Design
INSERT IGNORE INTO skill_certificates
  (id, user_id, skill_id, certificate_type, title, level_label,
   trust_score_snapshot, session_count_snapshot, average_rating_snapshot,
   verification_code, status, issued_at)
SELECT CONCAT('cert-demo-uiux-', uso.user_id), uso.user_id, uso.skill_id, 'SKILL_MENTOR',
       'Verified UI/UX Design Mentor', 'Expert Mentor',
       85, GREATEST(u.sessions_completed, 4), GREATEST(u.rating, 4.40),
       'SKILLEX-UIUX-2026', 'ACTIVE', NOW()
FROM user_skills_offered uso
JOIN skills s ON s.id = uso.skill_id
JOIN users  u ON u.id = uso.user_id
WHERE s.name = 'UI/UX Design'
ORDER BY u.rating DESC, u.sessions_completed DESC
LIMIT 1;

-- Digital Marketing
INSERT IGNORE INTO skill_certificates
  (id, user_id, skill_id, certificate_type, title, level_label,
   trust_score_snapshot, session_count_snapshot, average_rating_snapshot,
   verification_code, status, issued_at)
SELECT CONCAT('cert-demo-marketing-', uso.user_id), uso.user_id, uso.skill_id, 'SKILL_MENTOR',
       'Verified Digital Marketing Mentor', 'Expert Mentor',
       81, GREATEST(u.sessions_completed, 4), GREATEST(u.rating, 4.30),
       'SKILLEX-MARKETING-2026', 'ACTIVE', NOW()
FROM user_skills_offered uso
JOIN skills s ON s.id = uso.skill_id
JOIN users  u ON u.id = uso.user_id
WHERE s.name = 'Digital Marketing'
ORDER BY u.rating DESC, u.sessions_completed DESC
LIMIT 1;

-- Web Development
INSERT IGNORE INTO skill_certificates
  (id, user_id, skill_id, certificate_type, title, level_label,
   trust_score_snapshot, session_count_snapshot, average_rating_snapshot,
   verification_code, status, issued_at)
SELECT CONCAT('cert-demo-webdev-', uso.user_id), uso.user_id, uso.skill_id, 'SKILL_MENTOR',
       'Verified Web Development Mentor', 'Expert Mentor',
       83, GREATEST(u.sessions_completed, 4), GREATEST(u.rating, 4.30),
       'SKILLEX-WEBDEV-2026', 'ACTIVE', NOW()
FROM user_skills_offered uso
JOIN skills s ON s.id = uso.skill_id
JOIN users  u ON u.id = uso.user_id
WHERE s.name = 'Web Development'
ORDER BY u.rating DESC, u.sessions_completed DESC
LIMIT 1;

-- Data Science
INSERT IGNORE INTO skill_certificates
  (id, user_id, skill_id, certificate_type, title, level_label,
   trust_score_snapshot, session_count_snapshot, average_rating_snapshot,
   verification_code, status, issued_at)
SELECT CONCAT('cert-demo-datasci-', uso.user_id), uso.user_id, uso.skill_id, 'SKILL_MENTOR',
       'Verified Data Science Mentor', 'Expert Mentor',
       82, GREATEST(u.sessions_completed, 4), GREATEST(u.rating, 4.30),
       'SKILLEX-DATASCI-2026', 'ACTIVE', NOW()
FROM user_skills_offered uso
JOIN skills s ON s.id = uso.skill_id
JOIN users  u ON u.id = uso.user_id
WHERE s.name = 'Data Science'
ORDER BY u.rating DESC, u.sessions_completed DESC
LIMIT 1;
