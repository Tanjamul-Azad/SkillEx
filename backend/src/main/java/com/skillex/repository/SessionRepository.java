package com.skillex.repository;

import com.skillex.model.Session;
import com.skillex.model.Session.SessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionRepository extends JpaRepository<Session, String> {

    @Query("SELECT s FROM Session s WHERE s.teacher.id = :userId OR s.learner.id = :userId")
    Page<Session> findByUserId(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT s FROM Session s WHERE s.teacher.id = :userId OR s.learner.id = :userId ORDER BY s.scheduledAt DESC")
    Page<Session> findByUserIdOrderByScheduledAtDesc(@Param("userId") String userId, Pageable pageable);

    Page<Session> findByExchangeId(String exchangeId, Pageable pageable);

    long countByTeacherIdAndStatus(String teacherId, SessionStatus status);

    long countByLearnerIdAndStatus(String learnerId, SessionStatus status);

    @Query("SELECT COUNT(s) FROM Session s WHERE (s.teacher.id = :userId OR s.learner.id = :userId) AND s.status = :status")
    long countByUserIdAndStatus(@Param("userId") String userId, @Param("status") SessionStatus status);

    /** Platform-wide count of all completed sessions. */
    long countByStatus(SessionStatus status);
}
