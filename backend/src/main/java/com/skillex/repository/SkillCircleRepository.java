package com.skillex.repository;

import com.skillex.model.SkillCircle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillCircleRepository extends JpaRepository<SkillCircle, String> {

    Page<SkillCircle> findAllByOrderByMemberCountDesc(Pageable pageable);

    boolean existsByIdAndMembers_Id(String circleId, String userId);

    @Modifying
    @Query(value = "DELETE FROM skill_circle_members WHERE circle_id = :circleId AND user_id = :userId", nativeQuery = true)
    int deleteMember(@Param("circleId") String circleId, @Param("userId") String userId);
}
