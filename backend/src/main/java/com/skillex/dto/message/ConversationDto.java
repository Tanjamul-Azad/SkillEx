package com.skillex.dto.message;

import java.time.LocalDateTime;

/**
 * Conversation preview — one entry per peer the authenticated user has chatted with.
 * Returned by GET /api/messages/conversations.
 */
public record ConversationDto(
    String peerId,
    String peerName,
    String peerAvatar,
    String peerUniversity,
    boolean peerIsOnline,
    /** Content of the most recent message in this conversation */
    String lastMessage,
    /** "IMAGE" when the last message was an image attachment */
    String lastMessageType,
    LocalDateTime lastMessageTime,
    /** Count of unread messages FROM the peer TO the authenticated user */
    long unreadCount
) {}
