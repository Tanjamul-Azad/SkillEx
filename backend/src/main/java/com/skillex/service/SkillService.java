package com.skillex.service;

import com.skillex.model.Skill;

import java.util.List;

/**
 * Contract for skill catalogue operations.
 */
public interface SkillService {

    List<Skill> getAllSkills();

    Skill getSkillById(String skillId);

    Skill createSkill(String name, String icon, String category, String description);

    void deleteSkill(String skillId);
}
