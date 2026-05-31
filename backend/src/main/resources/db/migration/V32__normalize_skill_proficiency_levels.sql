UPDATE user_skills_offered
SET level = 'BEGINNER'
WHERE level IS NULL
   OR TRIM(CAST(level AS CHAR)) = ''
   OR CAST(level AS CHAR) NOT IN ('BEGINNER', 'MODERATE', 'EXPERT');

UPDATE user_skills_wanted
SET level = 'BEGINNER'
WHERE level IS NULL
   OR TRIM(CAST(level AS CHAR)) = ''
   OR CAST(level AS CHAR) NOT IN ('BEGINNER', 'MODERATE', 'EXPERT');
