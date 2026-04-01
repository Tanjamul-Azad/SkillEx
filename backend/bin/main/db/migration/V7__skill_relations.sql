-- ============================================================
-- SkillEX  V7 — Skill Similarity Graph
-- Creates the skill_relations table and seeds initial similarity
-- scores for the 20 skills in the V3 catalog.
--
-- Each row encodes a directional similarity edge:
--   "skill_id is similar to related_skill_id with score X"
-- Rows are inserted bidirectionally for symmetric relations.
-- ============================================================

CREATE TABLE IF NOT EXISTS skill_relations (
    skill_id         VARCHAR(36)    NOT NULL,
    related_skill_id VARCHAR(36)    NOT NULL,
    similarity_score DECIMAL(3, 2)  NOT NULL CHECK (similarity_score BETWEEN 0.00 AND 1.00),
    PRIMARY KEY (skill_id, related_skill_id),
    CONSTRAINT fk_skillrel_skill    FOREIGN KEY (skill_id)         REFERENCES skills (id) ON DELETE CASCADE,
    CONSTRAINT fk_skillrel_related  FOREIGN KEY (related_skill_id) REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed similarity edges ─────────────────────────────────────────────────────
-- Uses subqueries so this works regardless of which UUIDs MySQL assigned in V3.
-- Only inserts a row when both skills exist; INSERT IGNORE skips duplicates safely.

-- Web Development ↔ Python (both used in full-stack / backend)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.75 FROM skills a, skills b
WHERE a.name = 'Web Development' AND b.name = 'Python';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.75 FROM skills a, skills b
WHERE a.name = 'Python' AND b.name = 'Web Development';

-- Python ↔ Data Science (data science is Python-heavy)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.90 FROM skills a, skills b
WHERE a.name = 'Python' AND b.name = 'Data Science';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.90 FROM skills a, skills b
WHERE a.name = 'Data Science' AND b.name = 'Python';

-- Graphic Design ↔ UI/UX Design (very overlapping disciplines)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.85 FROM skills a, skills b
WHERE a.name = 'Graphic Design' AND b.name = 'UI/UX Design';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.85 FROM skills a, skills b
WHERE a.name = 'UI/UX Design' AND b.name = 'Graphic Design';

-- Graphic Design ↔ Figma (Figma is the primary tool for both)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.80 FROM skills a, skills b
WHERE a.name = 'Graphic Design' AND b.name = 'Figma';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.80 FROM skills a, skills b
WHERE a.name = 'Figma' AND b.name = 'Graphic Design';

-- UI/UX Design ↔ Figma
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.88 FROM skills a, skills b
WHERE a.name = 'UI/UX Design' AND b.name = 'Figma';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.88 FROM skills a, skills b
WHERE a.name = 'Figma' AND b.name = 'UI/UX Design';

-- 3D Modeling ↔ Graphic Design
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.65 FROM skills a, skills b
WHERE a.name = '3D Modeling' AND b.name = 'Graphic Design';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.65 FROM skills a, skills b
WHERE a.name = 'Graphic Design' AND b.name = '3D Modeling';

-- Video Editing ↔ Photography (visual production disciplines)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.70 FROM skills a, skills b
WHERE a.name = 'Video Editing' AND b.name = 'Photography';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.70 FROM skills a, skills b
WHERE a.name = 'Photography' AND b.name = 'Video Editing';

-- Video Editing ↔ Music Production (both are creative multimedia)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.60 FROM skills a, skills b
WHERE a.name = 'Video Editing' AND b.name = 'Music Production';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.60 FROM skills a, skills b
WHERE a.name = 'Music Production' AND b.name = 'Video Editing';

-- Guitar ↔ Music Production (instruments feed into production)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.72 FROM skills a, skills b
WHERE a.name = 'Guitar' AND b.name = 'Music Production';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.72 FROM skills a, skills b
WHERE a.name = 'Music Production' AND b.name = 'Guitar';

-- Drawing ↔ Graphic Design
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.75 FROM skills a, skills b
WHERE a.name = 'Drawing' AND b.name = 'Graphic Design';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.75 FROM skills a, skills b
WHERE a.name = 'Graphic Design' AND b.name = 'Drawing';

-- Drawing ↔ Calligraphy (hand-skill overlap)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.68 FROM skills a, skills b
WHERE a.name = 'Drawing' AND b.name = 'Calligraphy';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.68 FROM skills a, skills b
WHERE a.name = 'Calligraphy' AND b.name = 'Drawing';

-- Digital Marketing ↔ English Writing (content marketing)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.70 FROM skills a, skills b
WHERE a.name = 'Digital Marketing' AND b.name = 'English Writing';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.70 FROM skills a, skills b
WHERE a.name = 'English Writing' AND b.name = 'Digital Marketing';

-- Public Speaking ↔ English Writing (communication pair)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.65 FROM skills a, skills b
WHERE a.name = 'Public Speaking' AND b.name = 'English Writing';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.65 FROM skills a, skills b
WHERE a.name = 'English Writing' AND b.name = 'Public Speaking';

-- Excel ↔ Data Science (data analysis toolchain)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.72 FROM skills a, skills b
WHERE a.name = 'Excel' AND b.name = 'Data Science';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.72 FROM skills a, skills b
WHERE a.name = 'Data Science' AND b.name = 'Excel';

-- Excel ↔ Python (automation / data processing crossover)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.68 FROM skills a, skills b
WHERE a.name = 'Excel' AND b.name = 'Python';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.68 FROM skills a, skills b
WHERE a.name = 'Python' AND b.name = 'Excel';

-- French Language ↔ English Writing (language learning pair)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.55 FROM skills a, skills b
WHERE a.name = 'French Language' AND b.name = 'English Writing';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.55 FROM skills a, skills b
WHERE a.name = 'English Writing' AND b.name = 'French Language';

-- Chess ↔ Public Speaking (analytical confidence / tournament speaking)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.40 FROM skills a, skills b
WHERE a.name = 'Chess' AND b.name = 'Public Speaking';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.40 FROM skills a, skills b
WHERE a.name = 'Public Speaking' AND b.name = 'Chess';

-- Cooking ↔ Photography (food photography niche)
INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.45 FROM skills a, skills b
WHERE a.name = 'Cooking' AND b.name = 'Photography';

INSERT IGNORE INTO skill_relations (skill_id, related_skill_id, similarity_score)
SELECT a.id, b.id, 0.45 FROM skills a, skills b
WHERE a.name = 'Photography' AND b.name = 'Cooking';
