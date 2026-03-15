package com.skillex.service.embedding;

import org.springframework.stereotype.Component;


import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Offline embedding provider using hashed token vectors plus domain synonym expansion.
 *
 * <p>This is not as powerful as a hosted LLM embedding model, but it gives us a
 * real vector representation, cosine similarity, and deterministic behaviour for
 * local development/demo without extra infrastructure.
 */
@Component
public class HashingTextEmbeddingProvider implements TextEmbeddingProvider {

    private static final int DIMENSIONS = 128;

    private static final Map<String, List<String>> SYNONYMS = new HashMap<>();

    static {
        SYNONYMS.put("react", List.of("frontend", "ui", "javascript", "web"));
        SYNONYMS.put("frontend", List.of("react", "ui", "web", "javascript"));
        SYNONYMS.put("ui", List.of("frontend", "ux", "design", "figma"));
        SYNONYMS.put("ux", List.of("ui", "design", "figma", "prototype"));
        SYNONYMS.put("data", List.of("analytics", "science", "python", "excel"));
        SYNONYMS.put("analytics", List.of("data", "science", "excel", "python"));
        SYNONYMS.put("science", List.of("data", "analytics", "python", "ml"));
        SYNONYMS.put("python", List.of("backend", "data", "science", "automation"));
        SYNONYMS.put("web", List.of("frontend", "backend", "javascript", "react"));
        SYNONYMS.put("design", List.of("ui", "ux", "figma", "graphic"));
        SYNONYMS.put("graphic", List.of("design", "ui", "visual", "illustration"));
        SYNONYMS.put("photography", List.of("visual", "camera", "editing", "video"));
        SYNONYMS.put("video", List.of("editing", "photography", "media", "production"));
        SYNONYMS.put("marketing", List.of("content", "writing", "business", "brand"));
        SYNONYMS.put("writing", List.of("content", "communication", "marketing", "language"));
        SYNONYMS.put("language", List.of("writing", "speaking", "communication", "translation"));
    }

    @Override
    public String modelName() {
        return "local-hash-embedding-v1";
    }

    @Override
    public int dimensions() {
        return DIMENSIONS;
    }

    @Override
    public double[] embed(String text) {
        double[] vector = new double[DIMENSIONS];
        List<String> tokens = expandTokens(tokenize(text));
        if (tokens.isEmpty()) {
            return vector;
        }

        for (String token : tokens) {
            int bucket = Math.floorMod(token.hashCode(), DIMENSIONS);
            vector[bucket] += weight(token);
        }

        normalize(vector);
        return vector;
    }

    private List<String> tokenize(String text) {
        if (text == null || text.isBlank()) return List.of();

        String normalized = Normalizer.normalize(text, Normalizer.Form.NFKC)
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9\\s]+", " ")
            .replaceAll("\\s+", " ")
            .trim();

        if (normalized.isBlank()) return List.of();
        return List.of(normalized.split(" "));
    }

    private List<String> expandTokens(List<String> baseTokens) {
        List<String> expanded = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (String token : baseTokens) {
            if (token.length() < 2) continue;
            if (seen.add(token)) expanded.add(token);

            for (String synonym : SYNONYMS.getOrDefault(token, List.of())) {
                if (seen.add(synonym)) expanded.add(synonym);
            }
        }
        return expanded;
    }

    private double weight(String token) {
        return switch (token) {
            case "react", "frontend", "backend", "python", "data", "science", "design", "marketing" -> 1.4;
            default -> 1.0;
        };
    }

    private void normalize(double[] vector) {
        double norm = 0.0;
        for (double value : vector) {
            norm += value * value;
        }
        norm = Math.sqrt(norm);
        if (norm == 0.0) return;
        for (int i = 0; i < vector.length; i++) {
            vector[i] /= norm;
        }
    }
}
