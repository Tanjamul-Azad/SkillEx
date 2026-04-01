package com.skillex.service;

import com.skillex.model.Skill;
import com.skillex.dto.skill.SkillSearchResultDto;
import com.skillex.dto.common.PagedResponse;

import java.util.List;

/**
 * Contract for skill catalogue operations.
 */
public interface SkillService {

    List<Skill> getAllSkills();

    Skill getSkillById(String skillId);

    PagedResponse<Skill> getSkillsPage(int page, int size);

    Skill createSkill(String name, String icon, String category, String description);

    void deleteSkill(String skillId);

    List<SkillSearchResultDto> searchByIntent(String intentText);
}
