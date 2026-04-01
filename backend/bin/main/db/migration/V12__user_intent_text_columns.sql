-- Persist raw teach/learn intent text so matching can use dynamic intent semantics
-- without requiring every niche skill to exist in the global catalog.
ALTER TABLE users
  ADD COLUMN teach_intent_text TEXT NULL AFTER bio,
  ADD COLUMN learn_intent_text TEXT NULL AFTER teach_intent_text;
