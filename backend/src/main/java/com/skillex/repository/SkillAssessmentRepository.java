package com.skillex.repository;

import com.skillex.model.SkillAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SkillAssessmentRepository extends JpaRepository<SkillAssessment, String> {

    Optional<SkillAssessment> findFirstByUserIdAndSkillIdAndStatusOrderByCompletedAtDesc(
        String userId, String skillId, String status);
}
