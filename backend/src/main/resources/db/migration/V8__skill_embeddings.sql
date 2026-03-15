-- ============================================================
-- SkillEX V8 — Stored Skill Embeddings
-- Adds persistent vectors so semantic matching can use cosine
-- similarity rather than only the curated skill_relations graph.
-- ============================================================

CREATE TABLE IF NOT EXISTS skill_embeddings (
    skill_id      VARCHAR(36)   NOT NULL,
    model_name    VARCHAR(100)  NOT NULL,
    dimensions    INT           NOT NULL,
    vector_json   LONGTEXT      NOT NULL,
    source_text   VARCHAR(1000) NOT NULL,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (skill_id),
    CONSTRAINT fk_skill_embedding_skill FOREIGN KEY (skill_id)
        REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
