package com.skillex.service;

import com.skillex.model.SessionNote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NoteGenerationProcessor {

    private final NoteGenerationService noteGenerationService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Asynchronously triggers LLM processing and broadcasts results over the session's WebSocket notes channel.
     * Thread name: "notes-" (configured in AsyncConfig).
     */
    @Async("noteExecutor")
    public void generateAndSaveNotesAsync(String sessionId) {
        log.info("[AI-Notes-Task] Thread '{}' starting summary synthesis for session: {}", Thread.currentThread().getName(), sessionId);
        
        try {
            SessionNote note = noteGenerationService.generateAndSaveNotes(sessionId);
            
            // Broadcast the generated notes over WebSockets
            String destination = "/topic/session/" + sessionId + "/notes";
            messagingTemplate.convertAndSend(destination, Map.of(
                "sessionId", sessionId,
                "summary", note.getSummary(),
                "keyConcepts", note.getKeyConcepts(),
                "actionItems", note.getActionItems(),
                "resourcesMentioned", note.getResourcesMentioned(),
                "generatedAt", note.getGeneratedAt().toString()
            ));
            
            log.info("[AI-Notes-Task] Successfully generated notes and broadcasted to socket: {}", destination);
        } catch (Exception e) {
            log.error("[AI-Notes-Task] Failed to generate and broadcast notes.", e);
            
            // Broadcast failure alert so client UI spinner shuts down gracefully
            String destination = "/topic/session/" + sessionId + "/notes";
            messagingTemplate.convertAndSend(destination, Map.of(
                "sessionId", sessionId,
                "error", "Failed to generate notes: " + e.getMessage()
            ));
        }
    }
}
