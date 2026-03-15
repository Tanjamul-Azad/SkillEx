package com.skillex.repository;

import com.skillex.model.UserSkillWanted;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSkillWantedRepository
    extends JpaRepository<UserSkillWanted, UserSkillWanted.UserSkillId> {

    @Query("SELECT usw FROM UserSkillWanted usw JOIN FETCH usw.skill WHERE usw.id.userId = :userId")
    List<UserSkillWanted> findByIdUserId(@Param("userId") String userId);

    boolean existsByIdUserIdAndIdSkillId(String userId, String skillId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM UserSkillWanted u WHERE u.id.userId = :userId AND u.id.skillId = :skillId")
    void deleteByIdUserIdAndIdSkillId(@Param("userId") String userId, @Param("skillId") String skillId);
}
