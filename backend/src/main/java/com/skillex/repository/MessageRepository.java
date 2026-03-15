package com.skillex.repository;

import com.skillex.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {

    /**
     * Paginated conversation history between two users, oldest-first.
     */
    @Query("""
        SELECT m FROM Message m
        WHERE (m.sender.id = :userA AND m.receiver.id = :userB)
           OR (m.sender.id = :userB AND m.receiver.id = :userA)
        ORDER BY m.createdAt ASC
        """)
    Page<Message> findConversation(
        @Param("userA") String userA,
        @Param("userB") String userB,
        Pageable pageable);

    /**
     * Returns the most recent message between two users (limit via pageable).
     * Used to populate conversation previews.
     */
    @Query("""
        SELECT m FROM Message m
        WHERE (m.sender.id = :userA AND m.receiver.id = :userB)
           OR (m.sender.id = :userB AND m.receiver.id = :userA)
        ORDER BY m.createdAt DESC
        """)
    List<Message> findLastMessage(
        @Param("userA") String userA,
        @Param("userB") String userB,
        Pageable pageable);

    /**
     * Native query: returns the ID of every unique peer the user has chatted with,
     * ordered by the time of the most recent message (most-recent conversation first).
     */
    @Query(value = """
        SELECT peer_id FROM (
            SELECT
                CASE WHEN sender_id = :userId THEN receiver_id ELSE sender_id END AS peer_id,
                MAX(created_at) AS last_time
            FROM messages
            WHERE sender_id = :userId OR receiver_id = :userId
            GROUP BY peer_id
        ) AS peers
        ORDER BY last_time DESC
        """, nativeQuery = true)
    List<String> findPeerIds(@Param("userId") String userId);

    /**
     * Count unread messages sent BY senderId TO receiverId.
     */
    @Query("""
        SELECT COUNT(m) FROM Message m
        WHERE m.sender.id = :senderId
          AND m.receiver.id = :receiverId
          AND m.isRead = false
        """)
    long countUnread(
        @Param("senderId") String senderId,
        @Param("receiverId") String receiverId);

    /**
     * Marks all unread messages from a given sender to the receiver as read.
     */
    @Modifying
    @Query("""
        UPDATE Message m SET m.isRead = true
        WHERE m.sender.id = :senderId
          AND m.receiver.id = :receiverId
          AND m.isRead = false
        """)
    void markRead(
        @Param("senderId") String senderId,
        @Param("receiverId") String receiverId);
}
