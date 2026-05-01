package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.message.ConversationDto;
import com.skillex.dto.message.MessageDto;
import com.skillex.dto.message.SendMessageHttpRequest;
import com.skillex.dto.message.SendMessageRequest;
import com.skillex.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Objects;

/**
 * Handles both REST (message history, conversations) and WebSocket (real-time send).
 * Base REST path: /api/messages
 * WebSocket mapping: /app/chat.send
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService          messageService;
    private final SimpMessagingTemplate   messagingTemplate;

    // ── REST ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/messages/conversations
     * Returns all conversations for the authenticated user, most-recent first.
     */
    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationDto>>> getConversations(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(messageService.getConversations(userId(auth))));
    }

    /**
     * GET /api/messages/{peerId}?page=0&size=50
     * Returns paginated message history between the authenticated user and peerId.
     */
    @GetMapping("/{peerId}")
    public ResponseEntity<ApiResponse<PagedResponse<MessageDto>>> getHistory(
        Authentication auth,
        @PathVariable String peerId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            messageService.getHistory(userId(auth), peerId, page, size)));
    }

    /**
     * PATCH /api/messages/{peerId}/read
     * Marks all messages from peerId to the authenticated user as read.
     */
    @PatchMapping("/{peerId}/read")
    public ResponseEntity<ApiResponse<String>> markRead(
        Authentication auth,
        @PathVariable String peerId
    ) {
        messageService.markRead(userId(auth), peerId);
        return ResponseEntity.ok(ApiResponse.ok("Messages marked as read."));
    }

    /**
     * POST /api/messages/{peerId}
     * Sends a direct message over REST and also pushes to WebSocket queues.
     */
    @PostMapping("/{peerId}")
    public ResponseEntity<ApiResponse<MessageDto>> sendViaHttp(
        Authentication auth,
        @PathVariable String peerId,
        @RequestBody SendMessageHttpRequest req
    ) {
        String senderId = userId(auth);
        if (senderId == null || peerId == null) {
            return ResponseEntity.badRequest().build();
        }

        MessageDto saved = Objects.requireNonNull(messageService.sendMessage(
            senderId,
            peerId,
            req.content(),
            req.type(),
            req.imageUrl()
        ), "Saved message must not be null");
        messagingTemplate.convertAndSendToUser(peerId, "/queue/messages", saved);
        messagingTemplate.convertAndSendToUser(senderId, "/queue/messages", saved);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    // ── WebSocket ─────────────────────────────────────────────────────────────

    /**
     * Clients send to: /app/chat.send
     *
     * Saves the message to the DB and delivers it in real-time to:
     *  - /user/{receiverId}/queue/messages  — recipient's private queue
     *  - /user/{senderId}/queue/messages    — sender's own queue (for multi-tab sync)
     */
    @MessageMapping("/chat.send")
    public void handleChatMessage(Principal principal, SendMessageRequest req) {
        if (principal == null || req.toUserId() == null) return;

        String senderId = principal.getName();
        String receiverId = req.toUserId();

        MessageDto saved = Objects.requireNonNull(messageService.sendMessage(
            senderId,
            receiverId,
            req.content(),
            req.type(),
            req.imageUrl()
        ), "Saved message must not be null");

        // Push to receiver
        messagingTemplate.convertAndSendToUser(Objects.requireNonNull(receiverId, "Receiver ID must not be null"), "/queue/messages", saved);
        // Echo back to sender so all their open tabs stay in sync
        messagingTemplate.convertAndSendToUser(Objects.requireNonNull(senderId, "Sender ID must not be null"), "/queue/messages", saved);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String userId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) return null;
        return String.valueOf(auth.getPrincipal());
    }
}
