-- ============================================================
-- SkillEX V17 — Performance Index Additions
-- Adds composite indexes for high-traffic read/update paths.
-- ============================================================

-- ── reviews ──────────────────────────────────────────────────
SET @add_idx_reviews_to_user_created := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND INDEX_NAME = 'idx_reviews_to_user_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_reviews_to_user_created ON reviews(to_user, created_at)'
  )
);
PREPARE stmt_idx_reviews_to_user_created FROM @add_idx_reviews_to_user_created;
EXECUTE stmt_idx_reviews_to_user_created;
DEALLOCATE PREPARE stmt_idx_reviews_to_user_created;

SET @add_idx_reviews_from_user_session := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND INDEX_NAME = 'idx_reviews_from_user_session'
    ),
    'SELECT 1',
    'CREATE INDEX idx_reviews_from_user_session ON reviews(from_user, session_id)'
  )
);
PREPARE stmt_idx_reviews_from_user_session FROM @add_idx_reviews_from_user_session;
EXECUTE stmt_idx_reviews_from_user_session;
DEALLOCATE PREPARE stmt_idx_reviews_from_user_session;

-- ── exchanges ────────────────────────────────────────────────
SET @add_idx_exchanges_req_rec_status_created := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND INDEX_NAME = 'idx_exchanges_req_rec_status_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_exchanges_req_rec_status_created ON exchanges(requester_id, receiver_id, status, created_at)'
  )
);
PREPARE stmt_idx_exchanges_req_rec_status_created FROM @add_idx_exchanges_req_rec_status_created;
EXECUTE stmt_idx_exchanges_req_rec_status_created;
DEALLOCATE PREPARE stmt_idx_exchanges_req_rec_status_created;

SET @add_idx_exchanges_rec_req_status_created := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exchanges' AND INDEX_NAME = 'idx_exchanges_rec_req_status_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_exchanges_rec_req_status_created ON exchanges(receiver_id, requester_id, status, created_at)'
  )
);
PREPARE stmt_idx_exchanges_rec_req_status_created FROM @add_idx_exchanges_rec_req_status_created;
EXECUTE stmt_idx_exchanges_rec_req_status_created;
DEALLOCATE PREPARE stmt_idx_exchanges_rec_req_status_created;

-- ── connections ──────────────────────────────────────────────
SET @add_idx_connections_req_rec_status_created := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'connections' AND INDEX_NAME = 'idx_connections_req_rec_status_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_connections_req_rec_status_created ON connections(requester_id, receiver_id, status, created_at)'
  )
);
PREPARE stmt_idx_connections_req_rec_status_created FROM @add_idx_connections_req_rec_status_created;
EXECUTE stmt_idx_connections_req_rec_status_created;
DEALLOCATE PREPARE stmt_idx_connections_req_rec_status_created;

SET @add_idx_connections_rec_req_status_created := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'connections' AND INDEX_NAME = 'idx_connections_rec_req_status_created'
    ),
    'SELECT 1',
    'CREATE INDEX idx_connections_rec_req_status_created ON connections(receiver_id, requester_id, status, created_at)'
  )
);
PREPARE stmt_idx_connections_rec_req_status_created FROM @add_idx_connections_rec_req_status_created;
EXECUTE stmt_idx_connections_rec_req_status_created;
DEALLOCATE PREPARE stmt_idx_connections_rec_req_status_created;

-- ── messages ─────────────────────────────────────────────────
SET @add_idx_messages_receiver_sender_time := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_messages_receiver_sender_time'
    ),
    'SELECT 1',
    'CREATE INDEX idx_messages_receiver_sender_time ON messages(receiver_id, sender_id, created_at)'
  )
);
PREPARE stmt_idx_messages_receiver_sender_time FROM @add_idx_messages_receiver_sender_time;
EXECUTE stmt_idx_messages_receiver_sender_time;
DEALLOCATE PREPARE stmt_idx_messages_receiver_sender_time;

SET @add_idx_messages_receiver_read_sender := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_messages_receiver_read_sender'
    ),
    'SELECT 1',
    'CREATE INDEX idx_messages_receiver_read_sender ON messages(receiver_id, is_read, sender_id)'
  )
);
PREPARE stmt_idx_messages_receiver_read_sender FROM @add_idx_messages_receiver_read_sender;
EXECUTE stmt_idx_messages_receiver_read_sender;
DEALLOCATE PREPARE stmt_idx_messages_receiver_read_sender;
