package com.skillex.repository;

import com.skillex.model.SkillCheckMeeting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SkillCheckMeetingRepository extends JpaRepository<SkillCheckMeeting, String> {
    @Query("SELECT m FROM SkillCheckMeeting m WHERE m.requester.id = :userId OR m.targetUser.id = :userId ORDER BY m.createdAt DESC")
    Page<SkillCheckMeeting> findByUser(@Param("userId") String userId, Pageable pageable);
}
