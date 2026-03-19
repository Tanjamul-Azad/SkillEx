package com.skillex.service.embedding;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.model.Skill;
import com.skillex.model.SkillEmbedding;
import com.skillex.repository.SkillEmbeddingRepository;
import com.skillex.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Generates and stores embeddings for the skills catalog at startup.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class SkillEmbeddingSyncService {

    private static final TypeReference<double[]> DOUBLE_ARRAY_TYPE = new TypeReference<>() {};

    private final SkillRepository skillRepository;
    private final SkillEmbeddingRepository skillEmbeddingRepository;
    private final TextEmbeddingProvider embeddingProvider;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    @SuppressWarnings("null")
    public void refreshEmbeddings() {
        List<Skill> skills = skillRepository.findAll();
        if (skills.isEmpty()) {
            return;
        }

        Map<String, SkillEmbedding> existing = skillEmbeddingRepository.findAll().stream()
            .collect(Collectors.toMap(SkillEmbedding::getSkillId, Function.identity()));

        int updated = 0;
        for (Skill skill : skills) {
            String sourceText = sourceText(skill);
            SkillEmbedding current = existing.get(skill.getId());

            if (current != null
                && embeddingProvider.modelName().equals(current.getModelName())
                && sourceText.equals(current.getSourceText())) {
                continue;
            }

            double[] vector = embeddingProvider.embed(sourceText);
            SkillEmbedding saved = SkillEmbedding.builder()
                .skillId(skill.getId())
                .modelName(embeddingProvider.modelName())
                .dimensions(vector.length)
                .vectorJson(writeVector(vector))
                .sourceText(sourceText)
                .updatedAt(LocalDateTime.now())
                .build();
            skillEmbeddingRepository.save(saved);
            updated++;
        }

        if (updated > 0) {
            log.info("[SkillEmbeddingSync] Synced {} skill embeddings using {}.", updated, embeddingProvider.modelName());
        }
    }

    public Map<String, double[]> loadEmbeddingMap() {
        Map<String, double[]> raw = skillEmbeddingRepository.findAll().stream()
            .collect(Collectors.toMap(SkillEmbedding::getSkillId, e -> readVector(e.getVectorJson())));

        // Keep only vectors from the dominant dimension size to avoid accidental
        // mixed-model entries degrading cosine similarity.
        Map<Integer, Long> byDim = raw.values().stream()
            .collect(Collectors.groupingBy(v -> v.length, Collectors.counting()));
        int dominantDim = byDim.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(0);

        if (dominantDim == 0) {
            return raw;
        }

        Map<String, double[]> filtered = new HashMap<>();
        for (Map.Entry<String, double[]> entry : raw.entrySet()) {
            if (entry.getValue().length == dominantDim) {
                filtered.put(entry.getKey(), entry.getValue());
            }
        }
        return filtered;
    }

    public double[] readVector(String vectorJson) {
        try {
            return objectMapper.readValue(vectorJson, DOUBLE_ARRAY_TYPE);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to parse skill embedding vector.", ex);
        }
    }

    public String sourceText(Skill skill) {
        return String.join(" | ", Arrays.asList(
            defaultString(skill.getName()),
            defaultString(skill.getCategory()),
            defaultString(skill.getDescription()),
            defaultString(skill.getIcon())
        ));
    }

    private String writeVector(double[] vector) {
        try {
            return objectMapper.writeValueAsString(vector);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize skill embedding vector.", ex);
        }
    }

    private static String defaultString(String value) {
        return value == null ? "" : value;
    }
}