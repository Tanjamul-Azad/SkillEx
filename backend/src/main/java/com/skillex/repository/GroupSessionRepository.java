package com.skillex.repository;

import com.skillex.model.GroupSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface GroupSessionRepository extends JpaRepository<GroupSession, String> {

    Page<GroupSession> findByStatusInOrderByScheduledAtAsc(Collection<String> statuses, Pageable pageable);

    @Query("""
        SELECT DISTINCT gs FROM GroupSession gs
        LEFT JOIN gs.attendees a
        WHERE gs.mentor.id = :userId OR a.user.id = :userId
        ORDER BY gs.scheduledAt DESC
        """)
    Page<GroupSession> findUserSessions(@Param("userId") String userId, Pageable pageable);
}
