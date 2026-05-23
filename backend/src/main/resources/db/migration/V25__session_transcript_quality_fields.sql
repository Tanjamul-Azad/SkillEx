ALTER TABLE session_transcripts
  ADD COLUMN confidence_score DECIMAL(5,4) NULL AFTER spoken_at,
  ADD COLUMN detected_language VARCHAR(16) NULL AFTER confidence_score;
