package com.skillex.service;

import com.skillex.model.Session;
import com.skillex.model.SessionTranscript;
import com.skillex.model.SessionTranscript.SpeakerRole;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SessionTranscriptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptService {

    private static final int MAX_TRANSCRIPT_CHARS = 2000;
    private static final int DUPLICATE_WINDOW_SECONDS = 8;

    private final SessionTranscriptRepository transcriptRepository;
    private final SessionRepository sessionRepository;

    @Transactional
    public SessionTranscript saveTranscriptChunk(String sessionId, String speakerUserId, SpeakerRole role, String content) {
        String cleaned = cleanContent(content);
        if (cleaned.isBlank()) {
            throw new IllegalArgumentException("Transcript content cannot be blank.");
        }

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        boolean duplicate = transcriptRepository
                .findTop5BySessionIdAndSpeakerUserIdAndSpokenAtAfterOrderBySpokenAtDesc(
                        sessionId,
                        speakerUserId,
                        LocalDateTime.now().minusSeconds(DUPLICATE_WINDOW_SECONDS)
                )
                .stream()
                .anyMatch(existing -> normalizeForCompare(existing.getContent()).equals(normalizeForCompare(cleaned)));

        if (duplicate) {
            log.debug("[Transcript] Ignored duplicate transcript chunk from {} in session {}", speakerUserId, sessionId);
            return transcriptRepository
                    .findTop5BySessionIdAndSpeakerUserIdAndSpokenAtAfterOrderBySpokenAtDesc(
                            sessionId,
                            speakerUserId,
                            LocalDateTime.now().minusSeconds(DUPLICATE_WINDOW_SECONDS)
                    )
                    .getFirst();
        }

        SessionTranscript transcript = SessionTranscript.builder()
                .session(session)
                .speakerUserId(speakerUserId)
                .speakerRole(role)
                .content(cleaned)
                .spokenAt(LocalDateTime.now())
                .build();

        log.info("[Transcript] Saved transcript chunk from {} in session {}", speakerUserId, sessionId);
        return transcriptRepository.save(transcript);
    }

    @Transactional(readOnly = true)
    public List<SessionTranscript> getTranscripts(String sessionId) {
        return transcriptRepository.findBySessionIdOrderBySpokenAtAsc(sessionId);
    }

    private String cleanContent(String content) {
        if (content == null) {
            return "";
        }
        String cleaned = content.replaceAll("\\s+", " ").trim();
        if (cleaned.length() > MAX_TRANSCRIPT_CHARS) {
            return cleaned.substring(0, MAX_TRANSCRIPT_CHARS).trim();
        }
        return cleaned;
    }

    private String normalizeForCompare(String value) {
        return cleanContent(value).toLowerCase(java.util.Locale.ROOT);
    }
}
