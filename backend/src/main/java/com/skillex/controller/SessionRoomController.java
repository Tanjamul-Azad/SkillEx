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
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.NoteGenerationProcessor;
import com.skillex.service.NoteGenerationService;
import com.skillex.service.SessionService;
import com.skillex.service.SessionPresenceService;
import com.skillex.service.TranscriptProcessor;
import com.skillex.service.TranscriptService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Slf4j
public class SessionRoomController {

    private static final int JOIN_LATE_GRACE_MINS = 30;

    private final SessionRepository sessionRepository;
    private final AgoraTokenService agoraTokenService;
    private final TranscriptService transcriptService;
    private final TranscriptProcessor transcriptProcessor;
    private final SessionPresenceService sessionPresenceService;
    private final SessionService sessionService;
    private final NoteGenerationService noteGenerationService;
    private final NoteGenerationProcessor noteGenerationProcessor;
    private final SimpMessagingTemplate messagingTemplate;
    private final AccountRestrictionService restrictionService;

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
        restrictionService.assertCanUseAccount(userId, "SESSION");
        log.info("[SessionRoom] User {} requested joining room {}", userId, sessionId);

        Session session = findRoomSession(sessionId);

        // Enforce participant verification
        if (!isParticipant(session, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (session.getStatus() != SessionStatus.SCHEDULED && session.getStatus() != SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Session must be scheduled before it can be joined.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime latestJoin = session.getScheduledAt()
            .plusMinutes((session.getDurationMins() == null ? 60 : session.getDurationMins()) + JOIN_LATE_GRACE_MINS);
        if (now.isAfter(latestJoin)) {
            throw new IllegalStateException("Session has ended.");
        }

        // If scheduled, transition status to IN_PROGRESS as soon as a valid participant joins.
        if (session.getStatus() == SessionStatus.SCHEDULED) {
            session.setStatus(SessionStatus.IN_PROGRESS);
            sessionRepository.save(session);
            log.info("[SessionRoom] Session {} status transitioned to IN_PROGRESS", sessionId);
        }

        // Generate Agora token for client
        String appId = agoraTokenService.getAppId();
        if (appId == null || appId.isBlank()) {
            throw new IllegalStateException("Agora APP_ID is not configured.");
        }
        String token = agoraTokenService.generateToken(sessionId, userId);
        int uid = agoraTokenService.resolveUid(userId);
        broadcastPresence(sessionId, "JOINED", userId, sessionPresenceService.markJoined(sessionId, userId));

        return ResponseEntity.ok(new AgoraTokenDto(token, uid, sessionId, appId));
    }

    /**
     * POST /api/sessions/{sessionId}/leave
     * Marks participant as left in room presence state and broadcasts to peers.
     */
    @PostMapping("/{sessionId}/leave")
    public ResponseEntity<Void> leaveSessionRoom(
            Authentication auth,
            @PathVariable String sessionId
    ) {
        String userId = userId(auth);
        Session session = findRoomSession(sessionId);

        if (!isParticipant(session, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        broadcastPresence(sessionId, "LEFT", userId, sessionPresenceService.markLeft(sessionId, userId));
        return ResponseEntity.ok().build();
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

        Session session = findRoomSession(sessionId);

        if (!isParticipant(session, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var completed = sessionService.markCompleted(sessionId, userId);
        broadcastPresence(sessionId, "LEFT", userId, sessionPresenceService.markLeft(sessionId, userId));

        return ResponseEntity.ok(new SessionSummaryDto(completed.id(), completed.status(), LocalDateTime.now()));
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
        Session session = findRoomSession(sessionId);

        // Securely resolve speaker role on the backend (cannot be spoofed by clients)
        SpeakerRole role;
        if (safeEquals(userId, teacherId(session))) {
            role = SpeakerRole.TEACHER;
        } else if (safeEquals(userId, learnerId(session))) {
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
            @RequestBody TextTranscriptRequest body
    ) {
        try {
            String userId = userId(auth);
            String text = body == null ? null : body.text();
            if (text == null || text.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            Session session = findRoomSession(sessionId);

            SpeakerRole role;
            if (safeEquals(userId, teacherId(session))) {
                role = SpeakerRole.TEACHER;
            } else if (safeEquals(userId, learnerId(session))) {
                role = SpeakerRole.LEARNER;
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            SessionTranscript saved = transcriptService.saveTranscriptChunk(
                    sessionId,
                    userId,
                    role,
                    text,
                    body == null ? null : body.confidenceScore(),
                    body == null ? null : body.detectedLanguage()
            );
            String speakerName = resolveSpeakerName(session, saved.getSpeakerUserId(), saved.getSpeakerRole());

            String destination = "/topic/session/" + sessionId + "/transcript";
            messagingTemplate.convertAndSend(destination, buildTranscriptPayload(saved, speakerName));

            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            log.warn("[SessionRoom] Transcript rejected for session {}: {}", sessionId, ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception ex) {
            log.error("[SessionRoom] Unexpected transcript error for session {}", sessionId, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
        Session session = findRoomSession(sessionId);

        if (!isParticipant(session, userId)) {
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
        Session session = findRoomSession(sessionId);

        if (!isParticipant(session, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return noteGenerationService.getNotes(sessionId)
                .map(note -> ResponseEntity.ok(new SessionNoteDto(
                        note.getSession().getId(),
                        note.getKeyConcepts(),
                        note.getActionItems(),
                        note.getResourcesMentioned(),
                        note.getSummary(),
                        note.getDetailedNotes(),
                        note.getGeneratedAt()
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    /**
     * GET /api/sessions/{sessionId}/notes/export?format=md|pdf
     * Downloads generated notes as a well-organized Markdown or PDF document.
     */
    @GetMapping("/{sessionId}/notes/export")
    public ResponseEntity<byte[]> exportSessionNotes(
            Authentication auth,
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "md") String format
    ) {
        String userId = userId(auth);
        Session session = findRoomSession(sessionId);

        if (!isParticipant(session, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var noteOpt = noteGenerationService.getNotes(sessionId);
        if (noteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        String normalizedFormat = format == null ? "md" : format.trim().toLowerCase(Locale.ROOT);
        String safeSessionId = sessionId.replaceAll("[^a-zA-Z0-9_-]", "");

        try {
            if ("pdf".equals(normalizedFormat)) {
                byte[] pdf = noteGenerationService.buildPdfDocument(session, noteOpt.get());
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"session-notes-" + safeSessionId + ".pdf\"")
                        .contentType(MediaType.APPLICATION_PDF)
                        .body(pdf);
            }

            String markdown = noteGenerationService.buildMarkdownDocument(session, noteOpt.get());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"session-notes-" + safeSessionId + ".md\"")
                    .contentType(new MediaType("text", "markdown", StandardCharsets.UTF_8))
                    .body(markdown.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("[SessionRoom] Failed to export notes for session {}", sessionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
        Session session = findRoomSession(sessionId);

        if (!isParticipant(session, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<SessionTranscriptDto> dtos = transcriptService.getTranscripts(sessionId).stream()
                .map(t -> new SessionTranscriptDto(
                        t.getId(),
                        t.getSpeakerUserId(),
                        t.getSpeakerRole().toString(),
                        resolveSpeakerName(session, t.getSpeakerUserId(), t.getSpeakerRole()),
                        t.getContent(),
                        t.getSpokenAt(),
                        t.getConfidenceScore() == null ? null : t.getConfidenceScore().doubleValue(),
                        t.getDetectedLanguage()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // WebSocket / STOMP Mappings

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

    /**
     * GET /api/sessions/{sessionId}/presence
     * Returns current room participant presence snapshot.
     */
    @GetMapping("/{sessionId}/presence")
    public ResponseEntity<Map<String, Object>> getPresence(
            Authentication auth,
            @PathVariable String sessionId
    ) {
        String userId = userId(auth);
        Session session = findRoomSession(sessionId);

        if (!isParticipant(session, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        SessionPresenceService.PresenceSnapshot snapshot = sessionPresenceService.snapshot(sessionId);
        return ResponseEntity.ok(snapshot.toPayload("SNAPSHOT", userId));
    }

    @MessageMapping("/session/{sessionId}/presence")
    public void syncPresence(
            Authentication auth,
            @DestinationVariable String sessionId,
            Map<String, String> payload
    ) {
        if (auth == null || auth.getPrincipal() == null) {
            log.debug("[WS-Presence] Ignoring unauthenticated presence event for session {}", sessionId);
            return;
        }
        String userId = userId(auth);
        String action = payload.getOrDefault("action", "SNAPSHOT").trim().toUpperCase();

        SessionPresenceService.PresenceSnapshot snapshot = switch (action) {
            case "JOINED" -> sessionPresenceService.markJoined(sessionId, userId);
            case "LEFT" -> sessionPresenceService.markLeft(sessionId, userId);
            default -> sessionPresenceService.snapshot(sessionId);
        };

        broadcastPresence(sessionId, action, userId, snapshot);
    }

    private void broadcastPresence(String sessionId, String event, String actorUserId, SessionPresenceService.PresenceSnapshot snapshot) {
        messagingTemplate.convertAndSend(
            "/topic/session/" + sessionId + "/presence",
            snapshot.toPayload(event, actorUserId)
        );
    }

    private Session findRoomSession(String sessionId) {
        return sessionRepository.findRoomDetailsById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));
    }

    private String resolveSpeakerName(Session session, String speakerUserId, SpeakerRole role) {
        if (safeEquals(speakerUserId, teacherId(session))) {
            return session.getTeacher().getName();
        }
        if (safeEquals(speakerUserId, learnerId(session))) {
            return session.getLearner().getName();
        }
        return role == SpeakerRole.TEACHER ? "Teacher" : "Learner";
    }

    private Map<String, Object> buildTranscriptPayload(SessionTranscript transcript, String speakerName) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", transcript.getId());
        payload.put("speakerUserId", transcript.getSpeakerUserId());
        payload.put("speakerRole", transcript.getSpeakerRole().toString());
        payload.put("speakerName", speakerName);
        payload.put("content", transcript.getContent());
        payload.put("spokenAt", transcript.getSpokenAt().toString());
        if (transcript.getConfidenceScore() != null) {
            payload.put("confidenceScore", transcript.getConfidenceScore());
        }
        String normalizedLanguage = normalizeLanguageCode(transcript.getDetectedLanguage());
        if (normalizedLanguage != null) {
            payload.put("detectedLanguage", normalizedLanguage);
        }
        return payload;
    }

    private String normalizeLanguageCode(String detectedLanguage) {
        if (detectedLanguage == null || detectedLanguage.isBlank()) {
            return null;
        }
        String code = detectedLanguage.trim().toLowerCase(Locale.ROOT);
        return code.length() > 16 ? code.substring(0, 16) : code;
    }

    private boolean isParticipant(Session session, String userId) {
        return safeEquals(userId, teacherId(session)) || safeEquals(userId, learnerId(session));
    }

    private String teacherId(Session session) {
        return session != null && session.getTeacher() != null ? session.getTeacher().getId() : null;
    }

    private String learnerId(Session session) {
        return session != null && session.getLearner() != null ? session.getLearner().getId() : null;
    }

    private boolean safeEquals(String left, String right) {
        return left != null && right != null && left.equals(right);
    }

    private String userId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new AccessDeniedException("Missing authentication.");
        }
        return String.valueOf(auth.getPrincipal());
    }

    private record TextTranscriptRequest(String text, Double confidenceScore, String detectedLanguage) {}
}
