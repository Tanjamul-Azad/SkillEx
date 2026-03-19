package com.skillex.repository;

import com.skillex.model.UserSkillOffered;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSkillOfferedRepository
    extends JpaRepository<UserSkillOffered, UserSkillOffered.UserSkillId> {

    @Query("SELECT uso FROM UserSkillOffered uso JOIN FETCH uso.skill WHERE uso.id.userId = :userId")
    List<UserSkillOffered> findByIdUserId(@Param("userId") String userId);

    boolean existsByIdUserIdAndIdSkillId(String userId, String skillId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM UserSkillOffered u WHERE u.id.userId = :userId AND u.id.skillId = :skillId")
    void deleteByIdUserIdAndIdSkillId(@Param("userId") String userId, @Param("skillId") String skillId);
}
