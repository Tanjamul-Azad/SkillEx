package com.skillex.service.impl;

import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;
import com.skillex.dto.skill.SkillIntentInterpretResultDto;
import com.skillex.dto.skill.SkillIntentSuggestionDto;
import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import com.skillex.service.SkillIntentService;
import com.skillex.service.embedding.SkillEmbeddingSyncService;
import com.skillex.service.embedding.TextEmbeddingProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Interprets free-text "teach/learn" intents into catalog skills using embeddings.
 */
@Service
@RequiredArgsConstructor
public class SkillIntentServiceImpl implements SkillIntentService {

    private static final int MAX_SUGGESTIONS = 3;
    private static final int MIN_PRIMARY_CONFIDENCE = 35;

    private final SkillEmbeddingSyncService skillEmbeddingSyncService;
    private final TextEmbeddingProvider embeddingProvider;
    private final SkillRepository skillRepository;

    @Override
    @Transactional(readOnly = true)
    public SkillIntentInterpretResponse interpret(SkillIntentInterpretRequest request) {
        // Load once to avoid repeated DB calls per side.
        Map<String, double[]> embeddingMap = skillEmbeddingSyncService.loadEmbeddingMap();
        List<Skill> catalog = skillRepository.findAll();

        SkillIntentInterpretResultDto teach = interpretOne(
            request == null ? null : request.teachText(),
            catalog,
            embeddingMap
        );

        SkillIntentInterpretResultDto learn = interpretOne(
            request == null ? null : request.learnText(),
            catalog,
            embeddingMap
        );

        return new SkillIntentInterpretResponse(teach, learn);
    }

    private SkillIntentInterpretResultDto interpretOne(String rawText,
                                                       List<Skill> catalog,
                                                       Map<String, double[]> embeddingMap) {
        String normalized = normalize(rawText);
        if (normalized.isBlank() || catalog.isEmpty()) {
            return new SkillIntentInterpretResultDto(rawText, inferLevel(rawText), null, List.of());
        }

        double[] textVector = embeddingProvider.embed(normalized);

        List<SkillIntentSuggestionDto> ranked = catalog.stream()
            .map(skill -> toSuggestion(skill, textVector, normalized, embeddingMap.get(skill.getId())))
            .sorted(Comparator.comparingInt(SkillIntentSuggestionDto::confidence).reversed())
            .limit(MAX_SUGGESTIONS)
            .collect(Collectors.toList());

        SkillIntentSuggestionDto primary = ranked.isEmpty() ? null : ranked.get(0);
        if (primary != null && primary.confidence() < MIN_PRIMARY_CONFIDENCE) {
            primary = null;
        }

        return new SkillIntentInterpretResultDto(rawText, inferLevel(rawText), primary, ranked);
    }

    private SkillIntentSuggestionDto toSuggestion(Skill skill,
                                                  double[] textVector,
                                                  String normalizedText,
                                                  double[] skillVector) {
        double semantic = cosineSimilarity(textVector, skillVector);
        double lexical = lexicalOverlap(normalizedText, skill.getName(), skill.getCategory(), skill.getDescription());

        double combined = (semantic * 0.85) + (lexical * 0.15);
        int confidence = (int) Math.round(Math.max(0.0, Math.min(1.0, combined)) * 100);

        return new SkillIntentSuggestionDto(
            skill.getId(),
            skill.getName(),
            skill.getCategory(),
            confidence
        );
    }

    private double lexicalOverlap(String text, String... references) {
        Set<String> textTokens = tokenize(text);
        if (textTokens.isEmpty()) return 0.0;

        Set<String> refTokens = Arrays.stream(references)
            .filter(s -> s != null && !s.isBlank())
            .flatMap(s -> tokenize(s).stream())
            .collect(Collectors.toSet());

        if (refTokens.isEmpty()) return 0.0;

        long overlap = textTokens.stream().filter(refTokens::contains).count();
        return (double) overlap / Math.max(textTokens.size(), 1);
    }

    private Set<String> tokenize(String value) {
        return Arrays.stream(normalize(value).split("\\s+"))
            .filter(t -> !t.isBlank())
            .collect(Collectors.toSet());
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9\\s]", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private String inferLevel(String rawText) {
        String text = normalize(rawText);
        if (text.isBlank()) return null;

        Set<String> tokens = tokenize(text);

        if (containsAnyToken(tokens, "beginner", "new", "starting", "start", "basic", "basics", "novice")) {
            return "Beginner";
        }
        if (containsAnyToken(tokens, "advanced", "expert", "professional", "senior", "deep")) {
            return "Expert";
        }
        return "Moderate";
    }

    private boolean containsAnyToken(Set<String> tokens, String... terms) {
        for (String term : terms) {
            if (tokens.contains(term)) return true;
        }
        return false;
    }

    private double cosineSimilarity(double[] left, double[] right) {
        if (left == null || right == null || left.length == 0 || left.length != right.length) {
            return 0.0;
        }

        double dot = 0.0;
        double leftNorm = 0.0;
        double rightNorm = 0.0;
        for (int i = 0; i < left.length; i++) {
            dot += left[i] * right[i];
            leftNorm += left[i] * left[i];
            rightNorm += right[i] * right[i];
        }

        if (leftNorm == 0.0 || rightNorm == 0.0) return 0.0;
        double cosine = dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
        return Math.max(0.0, Math.min(1.0, cosine));
    }
}
