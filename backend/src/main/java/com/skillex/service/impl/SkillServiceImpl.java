package com.skillex.service.impl;

import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import com.skillex.service.SkillService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class SkillServiceImpl implements SkillService {

    private final SkillRepository skillRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Skill> getAllSkills() {
        return skillRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Skill getSkillById(String skillId) {
        return skillRepository.findById(skillId)
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + skillId));
    }

    @Override
    @Transactional
    public Skill createSkill(String name, String icon, String category, String description) {
        Skill skill = new Skill();
        skill.setName(name);
        skill.setIcon(icon);
        skill.setCategory(category);
        skill.setDescription(description);
        return skillRepository.save(skill);
    }

    @Override
    @Transactional
    public void deleteSkill(String skillId) {
        if (!skillRepository.existsById(skillId)) {
            throw new EntityNotFoundException("Skill not found: " + skillId);
        }
        skillRepository.deleteById(skillId);
    }
}
