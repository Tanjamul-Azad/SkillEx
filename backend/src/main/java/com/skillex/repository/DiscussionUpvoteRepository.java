package com.skillex.repository;

import com.skillex.model.DiscussionUpvote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface DiscussionUpvoteRepository extends JpaRepository<DiscussionUpvote, DiscussionUpvote.DiscussionUpvoteId> {

    boolean existsByIdDiscussionIdAndIdUserId(String discussionId, String userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM DiscussionUpvote du WHERE du.id.discussionId = :discussionId AND du.id.userId = :userId")
    void deleteByIdDiscussionIdAndIdUserId(@Param("discussionId") String discussionId, @Param("userId") String userId);

    @Query("SELECT du.id.discussionId FROM DiscussionUpvote du WHERE du.id.userId = :userId AND du.id.discussionId IN :discussionIds")
    List<String> findUpvotedDiscussionIdsByUser(@Param("userId") String userId, @Param("discussionIds") Collection<String> discussionIds);
}
