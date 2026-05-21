package com.skillex.controller;

import com.skillex.dto.AgoraTokenDto;
import com.skillex.dto.SessionNoteDto;
import com.skillex.dto.SessionSummaryDto;
import com.skillex.dto.SessionTranscriptDto;
import com.skillex.model.Session;
import com.skillex.model.Session.SessionStatus;
import com.skillex.model.SessionTranscript;
import com.skillex.model.SessionTranscript.SpeakerRole;
import com.skillex.repository.SessionRepository;
import com.skillex.service.AgoraTokenService;
import com.skillex.service.NoteGenerationProcessor;
import com.skillex.service.NoteGenerationService;
import com.skillex.service.TranscriptProcessor;
import com.skillex.service.TranscriptService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Slf4j
public class SessionRoomController {

    private final SessionRepository sessionRepository;
    private final AgoraTokenService agoraTokenService;
    private final TranscriptService transcriptService;
    private final TranscriptProcessor transcriptProcessor;
    private final NoteGenerationService noteGenerationService;
    private final NoteGenerationProcessor noteGenerationProcessor;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * POST /api/sessions/{sessionId}/join
     * Joins a live call room, updates status to IN_PROGRESS, and returns a secure Agora RTC Token.
     */
    @PostMapping("/{sessionId}/join")
    public ResponseEntity<AgoraTokenDto> joinSessionRoom(
            Authentication auth,
            @PathVariable String sessionId
    ) {
        String userId = userId(auth);
        log.info("[SessionRoom] User {} requested joining room {}", userId, sessionId);

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        // Enforce participant verification
        if (!userId.equals(session.getTeacher().getId()) && !userId.equals(session.getLearner().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (session.getStatus() != SessionStatus.SCHEDULED && session.getStatus() != SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Session must be scheduled before it can be joined.");
        }

        // If scheduled, transition status to IN_PROGRESS (the call is live!)
        if (session.getStatus() == SessionStatus.SCHEDULED) {
            session.setStatus(SessionStatus.IN_PROGRESS);
            sessionRepository.save(session);
            log.info("[SessionRoom] Session {} status transitioned to IN_PROGRESS", sessionId);
        }

        // Generate Agora token for client
        String token = agoraTokenService.generateToken(sessionId, userId);
        int uid = Math.abs(userId.hashCode());

        return ResponseEntity.ok(new AgoraTokenDto(token, uid, sessionId));
    }

    /**
     * POST /api/sessions/{sessionId}/end
     * Terminates a live room, updating status to COMPLETED.
     */
    @PostMapping("/{sessionId}/end")
    public ResponseEntity<SessionSummaryDto> endSessionRoom(
            Authentication auth,
            @PathVariable String sessionId
    ) {
        String userId = userId(auth);
        log.info("[SessionRoom] End call request for session {} by {}", sessionId, userId);

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!userId.equals(session.getTeacher().getId()) && !userId.equals(session.getLearner().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        session.setStatus(SessionStatus.COMPLETED);
        Session saved = sessionRepository.save(session);

        return ResponseEntity.ok(new SessionSummaryDto(saved.getId(), "COMPLETED", LocalDateTime.now()));
    }

    /**
     * POST /api/sessions/{sessionId}/transcribe
     * Accepts a chunk of speaker audio, resolves speaker role securely, and triggers Whisper transcribing asynchronously.
     */
    @PostMapping("/{sessionId}/transcribe")
    public ResponseEntity<Void> transcribeAudioChunk(
            Authentication auth,
            @PathVariable String sessionId,
            @RequestParam("audio") MultipartFile audioFile
    ) {
        String userId = userId(auth);
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        // Securely resolve speaker role on the backend (cannot be spoofed by clients)
        SpeakerRole role;
        if (userId.equals(session.getTeacher().getId())) {
            role = SpeakerRole.TEACHER;
        } else if (userId.equals(session.getLearner().getId())) {
            role = SpeakerRole.LEARNER;
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Offload task asynchronously to transcriptExecutor
        transcriptProcessor.processAudioChunk(sessionId, userId, role, audioFile);
        
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    /**
     * POST /api/sessions/{sessionId}/transcribe/text
     * Accepts pre-transcribed text directly (e.g. from free browser Web Speech API),
     * saves it, and broadcasts it over WebSockets.
     */
    @PostMapping("/{sessionId}/transcribe/text")
    public ResponseEntity<Void> submitTextTranscript(
            Authentication auth,
            @PathVariable String sessionId,
            @RequestBody Map<String, String> body
    ) {
        String userId = userId(auth);
        String text = body.get("text");
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        SpeakerRole role;
        if (userId.equals(session.getTeacher().getId())) {
            role = SpeakerRole.TEACHER;
        } else if (userId.equals(session.getLearner().getId())) {
            role = SpeakerRole.LEARNER;
        } else {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Save to database
        SessionTranscript saved = transcriptService.saveTranscriptChunk(sessionId, userId, role, text);

        // Broadcast real-time transcript payload over WS
        String destination = "/topic/session/" + sessionId + "/transcript";
        messagingTemplate.convertAndSend(destination, Map.of(
            "id", saved.getId(),
            "speakerUserId", saved.getSpeakerUserId(),
            "speakerRole", saved.getSpeakerRole().toString(),
            "content", saved.getContent(),
            "spokenAt", saved.getSpokenAt().toString()
        ));

        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/sessions/{sessionId}/notes/generate
     * Triggers asynchronous synthesis and compilation of AI notes via the Gemma/Ollama background threads.
     */
    @PostMapping("/{sessionId}/notes/generate")
    public ResponseEntity<Void> generateSessionNotes(
            Authentication auth,
            @PathVariable String sessionId
    ) {
        String userId = userId(auth);
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!userId.equals(session.getTeacher().getId()) && !userId.equals(session.getLearner().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Offload task asynchronously to noteExecutor
        noteGenerationProcessor.generateAndSaveNotesAsync(sessionId);

        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    /**
     * GET /api/sessions/{sessionId}/notes
     * Retrieves completed notes if synthesized.
     */
    @GetMapping("/{sessionId}/notes")
    public ResponseEntity<SessionNoteDto> getSessionNotes(
            Authentication auth,
            @PathVariable String sessionId
    ) {
        String userId = userId(auth);
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!userId.equals(session.getTeacher().getId()) && !userId.equals(session.getLearner().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return noteGenerationService.getNotes(sessionId)
                .map(note -> ResponseEntity.ok(new SessionNoteDto(
                        note.getSession().getId(),
                        note.getKeyConcepts(),
                        note.getActionItems(),
                        note.getResourcesMentioned(),
                        note.getSummary(),
                        note.getGeneratedAt()
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * GET /api/sessions/{sessionId}/transcript
     * Retrieves the chronological chat bubbles/transcripts list for review.
     */
    @GetMapping("/{sessionId}/transcript")
    public ResponseEntity<List<SessionTranscriptDto>> getSessionTranscript(
            Authentication auth,
            @PathVariable String sessionId
    ) {
        String userId = userId(auth);
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        if (!userId.equals(session.getTeacher().getId()) && !userId.equals(session.getLearner().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<SessionTranscriptDto> dtos = transcriptService.getTranscripts(sessionId).stream()
                .map(t -> new SessionTranscriptDto(
                        t.getId(),
                        t.getSpeakerUserId(),
                        t.getSpeakerRole().toString(),
                        t.getContent(),
                        t.getSpokenAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // ── WebSocket / STOMP Mappings ──────────────────────────────────────────

    /**
     * STOMP Message mapping to handle real-time collaborative shared editor notes.
     * Route: /app/session/{sessionId}/shared-notes
     */
    @MessageMapping("/session/{sessionId}/shared-notes")
    @SendTo("/topic/session/{sessionId}/shared-notes")
    public Map<String, String> syncSharedNotes(
            @DestinationVariable String sessionId,
            Map<String, String> payload
    ) {
        // Log brief detail and instantly broadcast text modifications to the peer
        log.debug("[WS-Sync] Broadcast typing for session: {}", sessionId);
        return payload;
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
