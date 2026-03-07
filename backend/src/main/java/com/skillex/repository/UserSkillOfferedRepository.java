package com.skillex.repository;

import com.skillex.model.UserSkillOffered;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSkillOfferedRepository
    extends JpaRepository<UserSkillOffered, UserSkillOffered.UserSkillId> {

    List<UserSkillOffered> findByIdUserId(String userId);

    void deleteByIdUserIdAndIdSkillId(String userId, String skillId);
}
