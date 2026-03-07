package com.skillex.repository;

import com.skillex.model.UserSkillWanted;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSkillWantedRepository
    extends JpaRepository<UserSkillWanted, UserSkillWanted.UserSkillId> {

    List<UserSkillWanted> findByIdUserId(String userId);

    void deleteByIdUserIdAndIdSkillId(String userId, String skillId);
}
