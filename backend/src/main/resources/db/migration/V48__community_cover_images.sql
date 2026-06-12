-- Cover images for community skill circles and discussions, so their cards
-- can show a real uploaded picture instead of a generic placeholder.
ALTER TABLE skill_circles ADD COLUMN cover_image_url VARCHAR(512) NULL AFTER description;
ALTER TABLE discussions ADD COLUMN cover_image_url VARCHAR(512) NULL AFTER content;
