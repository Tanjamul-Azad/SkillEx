package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.message.ConversationDto;
import com.skillex.dto.message.MessageDto;
import com.skillex.model.Message;
import com.skillex.model.User;
import com.skillex.repository.MessageRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.MessageService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository    userRepository;

    // ── Queries ──────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations(String userId) {
        List<String> peerIds = messageRepository.findPeerIds(userId);

        return peerIds.stream()
            .map(peerId -> {
                User peer = userRepository.findById(peerId).orElse(null);
                if (peer == null) return null;

                List<Message> lastMsgs = messageRepository.findLastMessage(
                    userId, peerId, PageRequest.of(0, 1));
                Message last = lastMsgs.isEmpty() ? null : lastMsgs.get(0);

                long unread = messageRepository.countUnread(peerId, userId); // messages from peer to me
                return new ConversationDto(
                    peer.getId(),
                    peer.getName(),
                    peer.getAvatar(),
                    peer.getUniversity(),
                    Boolean.TRUE.equals(peer.getIsOnline()),
                    last != null ? last.getContent() : "",
                    last != null ? last.getType().name() : "TEXT",
                    last != null ? last.getCreatedAt() : null,
                    unread
                );
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        // Order is already correct because findPeerIds is sorted by most-recent message
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<MessageDto> getHistory(String userId, String peerId, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        return PagedResponse.of(
            messageRepository.findConversation(userId, peerId, pageable).map(this::toDto));
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public MessageDto sendMessage(String senderId, String receiverId, String content, String type, String imageUrl) {
        User sender   = userRepository.findById(senderId)
            .orElseThrow(() -> new EntityNotFoundException("Sender not found: " + senderId));
        User receiver = userRepository.findById(receiverId)
            .orElseThrow(() -> new EntityNotFoundException("Receiver not found: " + receiverId));

        Message.MessageType msgType;
        try {
            msgType = type != null ? Message.MessageType.valueOf(type.toUpperCase()) : Message.MessageType.TEXT;
        } catch (IllegalArgumentException e) {
            msgType = Message.MessageType.TEXT;
        }

        Message msg = Message.builder()
            .sender(sender)
            .receiver(receiver)
            .content(content != null ? content : "")
            .type(msgType)
            .imageUrl(imageUrl)
            .isRead(false)
            .build();

        return toDto(messageRepository.save(msg));
    }

    @Override
    @Transactional
    public void markRead(String userId, String peerId) {
        messageRepository.markRead(peerId, userId);
    }

    // ── Mapper ───────────────────────────────────────────────────────────────

    private MessageDto toDto(Message m) {
        return new MessageDto(
            m.getId(),
            m.getSender().getId(),
            m.getReceiver().getId(),
            m.getContent(),
            m.getType().name(),
            m.getImageUrl(),
            Boolean.TRUE.equals(m.getIsRead()),
            m.getCreatedAt()
        );
    }
}
