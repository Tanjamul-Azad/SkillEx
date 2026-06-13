-- V44 — Link discussions to events.
-- Each community event gets its own discussion/activity wall, reusing the
-- existing discussion + reply infrastructure (replies, accepted answers,
-- solved state). event_id is nullable: a discussion belongs to at most one of
-- {event, circle, neither}. Deleting an event removes its activity threads.

ALTER TABLE discussions
    ADD COLUMN event_id VARCHAR(36) NULL AFTER circle_id;

ALTER TABLE discussions
    ADD CONSTRAINT fk_discussions_event
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

CREATE INDEX idx_discussions_event ON discussions (event_id);
