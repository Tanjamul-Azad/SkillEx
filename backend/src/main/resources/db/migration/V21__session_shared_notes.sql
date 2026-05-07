-- ============================================================
-- SkillEX — Add Shared Notes to Sessions  V21
-- ============================================================

ALTER TABLE sessions ADD COLUMN shared_notes TEXT DEFAULT NULL;
