package com.skillex.repository;

import com.skillex.model.SessionNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SessionNoteRepository extends JpaRepository<SessionNote, Long> {
    Optional<SessionNote> findBySessionId(String sessionId);

    /** Delete all AI-generated notes for a session (used during post-review cleanup) */
    void deleteBySessionId(String sessionId);
}

