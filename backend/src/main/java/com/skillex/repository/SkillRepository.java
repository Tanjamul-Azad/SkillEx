package com.skillex.repository;

import com.skillex.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String> {
    List<Skill> findByCategoryIgnoreCase(String category);
    List<Skill> findByNameContainingIgnoreCase(String keyword);
    Optional<Skill> findByNameIgnoreCase(String name);
}
