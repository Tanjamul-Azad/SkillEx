package com.skillex.repository;

import com.skillex.model.SessionTranscript;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SessionTranscriptRepository extends JpaRepository<SessionTranscript, Long> {
    List<SessionTranscript> findBySessionIdOrderBySpokenAtAsc(String sessionId);

    List<SessionTranscript> findTop5BySessionIdAndSpeakerUserIdAndSpokenAtAfterOrderBySpokenAtDesc(
        String sessionId,
        String speakerUserId,
        LocalDateTime spokenAt
    );

    /** Delete all transcript chunks for a session (used during post-review cleanup) */
    void deleteBySessionId(String sessionId);
}
