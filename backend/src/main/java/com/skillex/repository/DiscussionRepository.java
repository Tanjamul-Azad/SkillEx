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

    @Query("""
        SELECT d
        FROM Discussion d
        WHERE (:category IS NULL OR LOWER(d.category) = LOWER(:category))
          AND (:threadType IS NULL OR d.threadType = :threadType)
          AND (:status IS NULL OR d.status = :status)
          AND (:circleId IS NULL OR d.circle.id = :circleId)
          AND (:skillId IS NULL OR d.skill.id = :skillId)
        """)
    Page<Discussion> searchCommunityThreads(
        @Param("category") String category,
        @Param("threadType") Discussion.ThreadType threadType,
        @Param("status") Discussion.DiscussionStatus status,
        @Param("circleId") String circleId,
        @Param("skillId") String skillId,
        Pageable pageable
    );
}
