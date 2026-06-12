package com.skillex.repository;

import com.skillex.model.Discussion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionRepository extends JpaRepository<Discussion, String> {

    Page<Discussion> findByCategoryIgnoreCase(String category, Pageable pageable);

    Page<Discussion> findByIsPinnedTrueOrderByCreatedAtDesc(Pageable pageable);

    Page<Discussion> findByAuthorId(String authorId, Pageable pageable);

    long countByAuthorId(String authorId);

    long countByCircleIdAndStatus(String circleId, Discussion.DiscussionStatus status);

    long countByCircleIdAndThreadTypeAndStatus(String circleId, Discussion.ThreadType threadType, Discussion.DiscussionStatus status);

    // The last predicate keeps event activity threads scoped to their event:
    // they stay out of the general feed / circle help desk unless an eventId is
    // explicitly requested. (Comments must live outside the @Query JPQL string.)
    @Query("""
        SELECT d
        FROM Discussion d
        WHERE (:category IS NULL OR LOWER(d.category) = LOWER(:category))
          AND (:threadType IS NULL OR d.threadType = :threadType)
          AND (:status IS NULL OR d.status = :status)
          AND (:circleId IS NULL OR d.circle.id = :circleId)
          AND (:skillId IS NULL OR d.skill.id = :skillId)
          AND (:eventId IS NULL OR d.event.id = :eventId)
          AND (:eventId IS NOT NULL OR d.event IS NULL)
        """)
    Page<Discussion> searchCommunityThreads(
        @Param("category") String category,
        @Param("threadType") Discussion.ThreadType threadType,
        @Param("status") Discussion.DiscussionStatus status,
        @Param("circleId") String circleId,
        @Param("skillId") String skillId,
        @Param("eventId") String eventId,
        Pageable pageable
    );
}
