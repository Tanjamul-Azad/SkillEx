-- Group sessions become real "rooms": a cover image for nicer cards and a
-- meeting link the host shares when the workshop goes live.
ALTER TABLE group_sessions
    ADD COLUMN cover_image_url VARCHAR(512) NULL AFTER description,
    ADD COLUMN meeting_link VARCHAR(512) NULL AFTER cover_image_url,
    ADD COLUMN started_at DATETIME NULL AFTER meeting_link;
