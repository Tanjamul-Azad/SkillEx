package com.skillex.service.impl;

import com.skillex.dto.skill.SkillSearchResultDto;
import com.skillex.dto.common.PagedResponse;
import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import com.skillex.service.SkillService;
import com.skillex.service.embedding.SkillEmbeddingSyncService;
import com.skillex.service.embedding.TextEmbeddingProvider;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SkillServiceImpl implements SkillService {

    private final SkillRepository skillRepository;
    private final SkillEmbeddingSyncService skillEmbeddingSyncService;
    private final TextEmbeddingProvider embeddingProvider;

    @Value("${embedding.cosine.threshold:0.65}")
    private double cosineThreshold;

    @Override
    @Transactional(readOnly = true)
    public List<Skill> getAllSkills() {
        return skillRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Skill getSkillById(String skillId) {
        return skillRepository.findById(Objects.requireNonNull(skillId, "Skill ID must not be null"))
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + skillId));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<Skill> getSkillsPage(int page, int size) {
        return PagedResponse.of(skillRepository.findAll(PageRequest.of(page, size)));
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
        String safeId = Objects.requireNonNull(skillId, "Skill ID must not be null");
        if (!skillRepository.existsById(safeId)) {
            throw new EntityNotFoundException("Skill not found: " + skillId);
        }
        skillRepository.deleteById(safeId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SkillSearchResultDto> searchByIntent(String intentText) {
        String normalized = intentText == null ? "" : intentText.trim();
        if (normalized.isBlank()) {
            return List.of();
        }

        double[] intentVector = embeddingProvider.getEmbedding(normalized);
        Map<String, double[]> embeddingMap = skillEmbeddingSyncService.loadEmbeddingMap();
        if (embeddingMap.isEmpty()) {
            return List.of();
        }

        return skillRepository.findAll().stream()
            .map(skill -> {
                double[] skillVector = embeddingMap.get(skill.getId());
                double similarity = cosine(intentVector, skillVector);
                return new SkillSearchResultDto(
                    Objects.requireNonNull(skill.getId(), "Skill ID must not be null"),
                    Objects.requireNonNull(skill.getName(), "Skill name must not be null"),
                    skill.getCategory(),
                    skill.getIcon(),
                    skill.getDescription(),
                    similarity
                );
            })
            .filter(result -> result.similarity() >= cosineThreshold)
            .sorted(Comparator.comparingDouble(SkillSearchResultDto::similarity).reversed())
            .toList();
    }

    private double cosine(double[] a, double[] b) {
        if (a == null || b == null || a.length == 0 || b.length == 0 || a.length != b.length) {
            return 0.0;
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
