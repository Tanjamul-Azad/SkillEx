package com.skillex.repository;

import com.skillex.model.PendingSkillSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PendingSkillSuggestionRepository extends JpaRepository<PendingSkillSuggestion, String> {

    long countByPendingSkillId(String pendingSkillId);

    boolean existsByPendingSkillIdAndUserId(String pendingSkillId, String userId);
}
