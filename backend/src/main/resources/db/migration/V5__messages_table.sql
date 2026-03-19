-- V5: Real-time messaging table
CREATE TABLE IF NOT EXISTS messages (
    id          VARCHAR(36)   NOT NULL DEFAULT (UUID()) COMMENT 'UUID primary key',
    sender_id   VARCHAR(36)   NOT NULL                  COMMENT 'FK → users.id',
    receiver_id VARCHAR(36)   NOT NULL                  COMMENT 'FK → users.id',
    content     TEXT          NOT NULL,
    type        ENUM('TEXT','IMAGE') NOT NULL DEFAULT 'TEXT',
    image_url   VARCHAR(500)  NULL,
    is_read     TINYINT(1)    NOT NULL DEFAULT 0,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_messages_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_messages_sender   (sender_id),
    INDEX idx_messages_receiver (receiver_id),
    INDEX idx_messages_conv_time (sender_id, receiver_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
