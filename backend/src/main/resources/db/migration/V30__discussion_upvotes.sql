CREATE TABLE IF NOT EXISTS discussion_upvotes (
  discussion_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (discussion_id, user_id),
  CONSTRAINT fk_discussion_upvotes_discussion
    FOREIGN KEY (discussion_id) REFERENCES discussions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_discussion_upvotes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
