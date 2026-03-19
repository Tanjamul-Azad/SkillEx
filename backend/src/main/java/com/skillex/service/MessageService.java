package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.message.ConversationDto;
import com.skillex.dto.message.MessageDto;

import java.util.List;

/**
 * Contract for direct peer-to-peer messaging.
 */
public interface MessageService {

    /** Returns all conversations for the given user, sorted by most-recent message. */
    List<ConversationDto> getConversations(String userId);

    /** Paginated message history between userId and peerId. */
    PagedResponse<MessageDto> getHistory(String userId, String peerId, int page, int size);

    /** Persists a new message and returns the saved DTO. */
    MessageDto sendMessage(String senderId, String receiverId, String content, String type, String imageUrl);

    /** Marks all messages FROM peerId TO userId as read. */
    void markRead(String userId, String peerId);
}
