package com.skillex.repository;

import com.skillex.model.LearningPath;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LearningPathRepository extends JpaRepository<LearningPath, String> {
    List<LearningPath> findByUserIdAndStatus(String userId, String status);
    Page<LearningPath> findByUserId(String userId, Pageable pageable);
    List<LearningPath> findByUserIdAndGoalSkillId(String userId, String goalSkillId);
}
