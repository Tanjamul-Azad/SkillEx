package com.skillex.repository;

import com.skillex.model.DiscussionReply;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiscussionReplyRepository extends JpaRepository<DiscussionReply, String> {

    Page<DiscussionReply> findByDiscussionIdOrderByCreatedAtAsc(String discussionId, Pageable pageable);

    @Query("SELECT DISTINCT r.author.id FROM DiscussionReply r WHERE r.discussion.id = :discussionId")
    List<String> findParticipantUserIdsByDiscussionId(@Param("discussionId") String discussionId);

    @Modifying
    @Query("UPDATE DiscussionReply r SET r.isAccepted = false WHERE r.discussion.id = :discussionId")
    void clearAcceptedForDiscussion(@Param("discussionId") String discussionId);
}
