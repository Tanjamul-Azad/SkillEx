package com.skillex.repository;

import com.skillex.model.SkillTrustScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkillTrustScoreRepository extends JpaRepository<SkillTrustScore, String> {
    Optional<SkillTrustScore> findByUserIdAndSkillId(String userId, String skillId);
}
