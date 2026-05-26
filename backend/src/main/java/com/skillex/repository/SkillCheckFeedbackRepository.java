package com.skillex.repository;

import com.skillex.model.SkillCheckFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkillCheckFeedbackRepository extends JpaRepository<SkillCheckFeedback, String> {
    boolean existsByMeetingIdAndReviewerId(String meetingId, String reviewerId);
    Optional<SkillCheckFeedback> findByMeetingIdAndReviewerId(String meetingId, String reviewerId);
    long countByTargetUserIdAndMeetingSkillIdAndOutcome(String targetUserId, String skillId, SkillCheckFeedback.SkillCheckOutcome outcome);
    long countByTargetUserIdAndMeetingSkillId(String targetUserId, String skillId);
    long countByMeetingId(String meetingId);
}
