package com.skillex.repository;

import com.skillex.model.Session;
import com.skillex.model.Session.SessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, String> {

    @EntityGraph(attributePaths = {"teacher", "learner", "skill"})
    @Query("SELECT s FROM Session s WHERE s.id = :id")
    Optional<Session> findRoomDetailsById(@Param("id") String id);

    /** True when the user is the teacher or learner of the session — used to gate WebSocket room topics. */
    @Query("""
        SELECT (COUNT(s) > 0) FROM Session s
        WHERE s.id = :sessionId
          AND (s.teacher.id = :userId OR s.learner.id = :userId)
        """)
    boolean isParticipant(@Param("sessionId") String sessionId, @Param("userId") String userId);

    @Query("SELECT s FROM Session s WHERE s.teacher.id = :userId OR s.learner.id = :userId")
    Page<Session> findByUserId(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT s FROM Session s WHERE s.teacher.id = :userId OR s.learner.id = :userId ORDER BY s.scheduledAt DESC")
    Page<Session> findByUserIdOrderByScheduledAtDesc(@Param("userId") String userId, Pageable pageable);

    Page<Session> findByExchangeId(String exchangeId, Pageable pageable);

    /** Find active (non-terminal) sessions for an exchange */
    List<Session> findByExchangeIdAndStatusIn(String exchangeId, Collection<SessionStatus> statuses);

    List<Session> findByStatusAndUpdatedAtBefore(SessionStatus status, LocalDateTime updatedAt);

    /** Find active sessions for the same exchange direction. */
    List<Session> findByExchangeIdAndSkillIdAndStatusIn(String exchangeId, String skillId, Collection<SessionStatus> statuses);

    @Query("""
        SELECT s FROM Session s
        WHERE (s.teacher.id = :userId OR s.learner.id = :userId)
          AND s.status IN :statuses
          AND s.scheduledAt >= :windowStart
          AND s.scheduledAt < :windowEnd
    """)
    List<Session> findActiveSessionsInWindow(
        @Param("userId") String userId,
        @Param("statuses") Collection<SessionStatus> statuses,
        @Param("windowStart") LocalDateTime windowStart,
        @Param("windowEnd") LocalDateTime windowEnd
    );

    long countByTeacherIdAndStatus(String teacherId, SessionStatus status);

    long countByTeacherIdAndSkillIdAndStatus(String teacherId, String skillId, SessionStatus status);

    long countByLearnerIdAndStatus(String learnerId, SessionStatus status);

    long countByLearnerIdAndSkillIdAndStatus(String learnerId, String skillId, SessionStatus status);

    @Query("SELECT COUNT(s) FROM Session s WHERE (s.teacher.id = :userId OR s.learner.id = :userId) AND s.status = :status")
    long countByUserIdAndStatus(@Param("userId") String userId, @Param("status") SessionStatus status);

    /** Platform-wide count of all completed sessions. */
    long countByStatus(SessionStatus status);

    /** Platform-wide sum of taught minutes across sessions in a given status. */
    @Query("SELECT COALESCE(SUM(s.durationMins), 0) FROM Session s WHERE s.status = :status")
    long sumDurationMinsByStatus(@Param("status") SessionStatus status);
}
