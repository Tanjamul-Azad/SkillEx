package com.skillex.repository;

import com.skillex.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String> {
    List<Skill> findByCategoryIgnoreCase(String category);
    List<Skill> findByNameContainingIgnoreCase(String keyword);
}
