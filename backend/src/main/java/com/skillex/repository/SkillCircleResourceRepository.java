package com.skillex.repository;

import com.skillex.model.SkillCircleResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkillCircleResourceRepository extends JpaRepository<SkillCircleResource, String> {

    Page<SkillCircleResource> findByCircleIdOrderByIsPinnedDescCreatedAtDesc(String circleId, Pageable pageable);

    List<SkillCircleResource> findTop5ByCircleIdOrderByIsPinnedDescUpvotesDescCreatedAtDesc(String circleId);

    long countByCircleId(String circleId);
}
