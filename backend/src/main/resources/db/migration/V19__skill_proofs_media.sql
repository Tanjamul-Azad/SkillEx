-- V19: Add media columns for skill proofs and posts

ALTER TABLE user_skills_offered
ADD COLUMN proof_video_url VARCHAR(500) NULL,
ADD COLUMN subtitle VARCHAR(500) NULL;

ALTER TABLE posts
ADD COLUMN media_url VARCHAR(500) NULL;
