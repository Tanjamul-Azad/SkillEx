-- ============================================================
-- SkillEX — one-time demo DB cleanup
-- Removes automated QA/test bot accounts (emails ending in @skillex.local
-- or .test) and ALL rows that reference them, so the Skill Chain, matches,
-- and marketplace show only real curated users on camera.
--
-- Safe: deletes dependent rows across every users-referencing table first
-- (FK checks disabled for the batch), then the users themselves. Curated
-- accounts (real-user-*, named DataSeeder users, real gmail logins) are kept.
--
-- Run:  mysql -u root skillex < scripts/dev/cleanup-demo-junk.sql
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS junk_users;
CREATE TEMPORARY TABLE junk_users (id VARCHAR(36) COLLATE utf8mb4_unicode_ci PRIMARY KEY);
INSERT INTO junk_users
  SELECT id FROM users
  WHERE email LIKE '%@skillex.local' OR email LIKE '%.test';

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM admin_audit_logs        WHERE admin_user_id        IN (SELECT id FROM junk_users);
DELETE FROM ai_helper_conversations WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM comments                WHERE author_id            IN (SELECT id FROM junk_users);
DELETE FROM connections             WHERE receiver_id          IN (SELECT id FROM junk_users);
DELETE FROM connections             WHERE requester_id         IN (SELECT id FROM junk_users);
DELETE FROM content_reports         WHERE reporter_user_id     IN (SELECT id FROM junk_users);
DELETE FROM content_reports         WHERE target_user_id       IN (SELECT id FROM junk_users);
DELETE FROM credit_transactions     WHERE counterparty_user_id IN (SELECT id FROM junk_users);
DELETE FROM credit_transactions     WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM discussions             WHERE author_id            IN (SELECT id FROM junk_users);
DELETE FROM discussion_replies      WHERE author_id            IN (SELECT id FROM junk_users);
DELETE FROM discussion_upvotes      WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM events                  WHERE host_id              IN (SELECT id FROM junk_users);
DELETE FROM event_attendees         WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM event_rsvps             WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM exchanges               WHERE provider_id          IN (SELECT id FROM junk_users);
DELETE FROM exchanges               WHERE requester_id         IN (SELECT id FROM junk_users);
DELETE FROM feedbacks               WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM feed_preferences        WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM messages                WHERE receiver_id          IN (SELECT id FROM junk_users);
DELETE FROM messages                WHERE sender_id            IN (SELECT id FROM junk_users);
DELETE FROM moderation_actions      WHERE admin_user_id        IN (SELECT id FROM junk_users);
DELETE FROM moderation_actions      WHERE target_user_id       IN (SELECT id FROM junk_users);
DELETE FROM moderation_cases        WHERE assigned_admin_id    IN (SELECT id FROM junk_users);
DELETE FROM moderation_cases        WHERE target_user_id       IN (SELECT id FROM junk_users);
DELETE FROM notifications           WHERE from_user_id         IN (SELECT id FROM junk_users);
DELETE FROM notifications           WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM pending_skills          WHERE requested_by_user_id IN (SELECT id FROM junk_users);
DELETE FROM pending_skills          WHERE reviewed_by_user_id  IN (SELECT id FROM junk_users);
DELETE FROM pending_skill_suggestions WHERE user_id            IN (SELECT id FROM junk_users);
DELETE FROM portfolio_proofs        WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM posts                   WHERE author_id            IN (SELECT id FROM junk_users);
DELETE FROM post_likes              WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM reviews                 WHERE from_user            IN (SELECT id FROM junk_users);
DELETE FROM reviews                 WHERE to_user              IN (SELECT id FROM junk_users);
DELETE FROM sessions                WHERE learner_id           IN (SELECT id FROM junk_users);
DELETE FROM sessions                WHERE proposed_by          IN (SELECT id FROM junk_users);
DELETE FROM sessions                WHERE teacher_id           IN (SELECT id FROM junk_users);
DELETE FROM session_transcripts     WHERE speaker_user_id      IN (SELECT id FROM junk_users);
DELETE FROM skill_catalog_audit     WHERE actor_user_id        IN (SELECT id FROM junk_users);
DELETE FROM skill_certificates      WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM skill_check_feedback    WHERE reviewer_id          IN (SELECT id FROM junk_users);
DELETE FROM skill_check_feedback    WHERE target_user_id       IN (SELECT id FROM junk_users);
DELETE FROM skill_check_meetings    WHERE requester_id         IN (SELECT id FROM junk_users);
DELETE FROM skill_check_meetings    WHERE target_user_id       IN (SELECT id FROM junk_users);
DELETE FROM skill_circles           WHERE owner_id             IN (SELECT id FROM junk_users);
DELETE FROM skill_circle_members    WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM skill_circle_resources  WHERE author_id            IN (SELECT id FROM junk_users);
DELETE FROM skill_trust_scores      WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM stories                 WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM user_badges             WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM user_credit_wallets     WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM user_progress           WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM user_restrictions       WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM user_skills_offered     WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM user_skills_wanted      WHERE user_id              IN (SELECT id FROM junk_users);
DELETE FROM xp_events               WHERE user_id              IN (SELECT id FROM junk_users);

DELETE FROM users WHERE id IN (SELECT id FROM junk_users);

SET FOREIGN_KEY_CHECKS = 1;

DROP TEMPORARY TABLE IF EXISTS junk_users;
