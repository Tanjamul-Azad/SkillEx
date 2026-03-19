package com.skillex.repository;

import com.skillex.model.SkillCircle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillCircleRepository extends JpaRepository<SkillCircle, String> {

    Page<SkillCircle> findAllByOrderByMemberCountDesc(Pageable pageable);
}
