-- V6: Widen avatar column to TEXT so it can store compressed base64 images
ALTER TABLE users MODIFY COLUMN avatar TEXT NULL;
