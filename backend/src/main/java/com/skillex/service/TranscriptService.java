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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptService {

    private static final int MAX_TRANSCRIPT_CHARS = 2000;
    private static final int DUPLICATE_WINDOW_SECONDS = 8;
    private static final int ROOM_ECHO_WINDOW_SECONDS = 4;

    private final SessionTranscriptRepository transcriptRepository;
    private final SessionRepository sessionRepository;

    @Transactional
    public SessionTranscript saveTranscriptChunk(String sessionId, String speakerUserId, SpeakerRole role, String content) {
        return saveTranscriptChunk(sessionId, speakerUserId, role, content, null, null);
    }

    @Transactional
    public SessionTranscript saveTranscriptChunk(
            String sessionId,
            String speakerUserId,
            SpeakerRole role,
            String content,
            Double confidenceScore,
            String detectedLanguage
    ) {
        String cleaned = cleanContent(content);
        if (cleaned.isBlank()) {
            throw new IllegalArgumentException("Transcript content cannot be blank.");
        }

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        List<SessionTranscript> recentTranscripts = transcriptRepository
                .findTop5BySessionIdAndSpeakerUserIdAndSpokenAtAfterOrderBySpokenAtDesc(
                        sessionId,
                        speakerUserId,
                        LocalDateTime.now().minusSeconds(DUPLICATE_WINDOW_SECONDS)
                );

        SessionTranscript duplicate = recentTranscripts.stream()
                .filter(existing -> normalizeForCompare(existing.getContent()).equals(normalizeForCompare(cleaned)))
                .findFirst()
                .orElse(null);

        if (duplicate != null) {
            log.debug("[Transcript] Ignored duplicate transcript chunk from {} in session {}", speakerUserId, sessionId);
            return duplicate;
        }

        List<SessionTranscript> recentRoomTranscripts = transcriptRepository
                .findTop10BySessionIdAndSpokenAtAfterOrderBySpokenAtDesc(
                        sessionId,
                        LocalDateTime.now().minusSeconds(ROOM_ECHO_WINDOW_SECONDS)
                );

        SessionTranscript roomEchoDuplicate = recentRoomTranscripts.stream()
                .filter(existing -> !speakerUserId.equals(existing.getSpeakerUserId()))
                .filter(existing -> normalizeForCompare(existing.getContent()).equals(normalizeForCompare(cleaned)))
                .findFirst()
                .orElse(null);

        if (roomEchoDuplicate != null) {
            log.debug(
                    "[Transcript] Ignored likely speaker echo from {} in session {}",
                    speakerUserId,
                    sessionId
            );
            return roomEchoDuplicate;
        }

        SessionTranscript transcript = SessionTranscript.builder()
                .session(session)
                .speakerUserId(speakerUserId)
                .speakerRole(role)
                .content(cleaned)
                .spokenAt(LocalDateTime.now())
                .confidenceScore(normalizeConfidence(confidenceScore))
                .detectedLanguage(normalizeLanguage(detectedLanguage))
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

    private BigDecimal normalizeConfidence(Double confidenceScore) {
        if (confidenceScore == null || confidenceScore.isNaN() || confidenceScore.isInfinite()) {
            return null;
        }
        double bounded = Math.max(0d, Math.min(1d, confidenceScore));
        return BigDecimal.valueOf(bounded).setScale(4, RoundingMode.HALF_UP);
    }

    private String normalizeLanguage(String detectedLanguage) {
        if (detectedLanguage == null || detectedLanguage.isBlank()) {
            return null;
        }
        String normalized = detectedLanguage.trim().toLowerCase(java.util.Locale.ROOT);
        return normalized.length() > 16 ? normalized.substring(0, 16) : normalized;
    }
}
