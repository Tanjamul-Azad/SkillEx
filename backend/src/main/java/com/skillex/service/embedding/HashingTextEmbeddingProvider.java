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
        // ── Technology ────────────────────────────────────────────
        SYNONYMS.put("react", List.of("frontend", "ui", "javascript", "web", "nextjs"));
        SYNONYMS.put("frontend", List.of("react", "ui", "web", "javascript", "html", "css"));
        SYNONYMS.put("backend", List.of("api", "server", "java", "python", "nodejs", "spring"));
        SYNONYMS.put("ui", List.of("frontend", "ux", "design", "figma", "interface"));
        SYNONYMS.put("ux", List.of("ui", "design", "figma", "prototype", "usability"));
        SYNONYMS.put("data", List.of("analytics", "science", "python", "excel", "database"));
        SYNONYMS.put("analytics", List.of("data", "science", "excel", "python", "statistics"));
        SYNONYMS.put("science", List.of("data", "analytics", "python", "ml", "research"));
        SYNONYMS.put("python", List.of("backend", "data", "science", "automation", "scripting"));
        SYNONYMS.put("web", List.of("frontend", "backend", "javascript", "react", "html"));
        SYNONYMS.put("javascript", List.of("web", "frontend", "react", "nodejs", "typescript"));
        SYNONYMS.put("java", List.of("backend", "spring", "programming", "software"));
        SYNONYMS.put("ml", List.of("machine", "learning", "ai", "data", "science", "model"));
        SYNONYMS.put("ai", List.of("ml", "machine", "learning", "chatgpt", "data", "science"));
        SYNONYMS.put("machine", List.of("ml", "ai", "learning", "data", "automation"));
        SYNONYMS.put("automation", List.of("python", "scripting", "robotics", "machine", "ai"));
        SYNONYMS.put("database", List.of("sql", "mysql", "data", "backend", "mongodb"));
        SYNONYMS.put("sql", List.of("database", "mysql", "data", "backend"));
        SYNONYMS.put("devops", List.of("cloud", "docker", "kubernetes", "deployment", "server"));
        SYNONYMS.put("cloud", List.of("aws", "azure", "devops", "server", "hosting"));
        SYNONYMS.put("mobile", List.of("android", "ios", "flutter", "app", "swift", "kotlin"));
        SYNONYMS.put("android", List.of("mobile", "kotlin", "java", "app"));
        SYNONYMS.put("ios", List.of("mobile", "swift", "apple", "app"));
        SYNONYMS.put("cybersecurity", List.of("security", "hacking", "network", "privacy"));
        SYNONYMS.put("security", List.of("cybersecurity", "hacking", "network", "privacy"));

        // ── Design & Creative Arts ─────────────────────────────────
        SYNONYMS.put("design", List.of("ui", "ux", "figma", "graphic", "visual", "creative"));
        SYNONYMS.put("graphic", List.of("design", "ui", "visual", "illustration", "photoshop"));
        SYNONYMS.put("photography", List.of("visual", "camera", "editing", "video", "cinematography", "photo"));
        SYNONYMS.put("video", List.of("editing", "photography", "media", "production", "cinematography", "film"));
        SYNONYMS.put("cinematography", List.of("film", "camera", "video", "photography", "editing", "production", "visual"));
        SYNONYMS.put("film", List.of("cinematography", "video", "editing", "production", "camera", "movie"));
        SYNONYMS.put("camera", List.of("photography", "cinematography", "video", "film", "visual"));
        SYNONYMS.put("editing", List.of("video", "photography", "film", "photoshop", "premiere", "production"));
        SYNONYMS.put("illustration", List.of("graphic", "design", "drawing", "art", "visual"));
        SYNONYMS.put("drawing", List.of("illustration", "art", "design", "sketch", "painting"));
        SYNONYMS.put("painting", List.of("art", "drawing", "creative", "watercolor", "canvas"));
        SYNONYMS.put("art", List.of("drawing", "painting", "illustration", "creative", "design"));
        SYNONYMS.put("animation", List.of("video", "design", "film", "motion", "graphics", "editing"));
        SYNONYMS.put("motion", List.of("animation", "video", "graphics", "design", "film"));
        SYNONYMS.put("figma", List.of("design", "ui", "ux", "prototype", "wireframe"));
        SYNONYMS.put("photoshop", List.of("editing", "graphic", "design", "photography", "illustration"));

        // ── Music & Performing Arts ────────────────────────────────
        SYNONYMS.put("music", List.of("guitar", "piano", "singing", "instrument", "audio", "production", "drums"));
        SYNONYMS.put("guitar", List.of("music", "instrument", "acoustic", "performance", "bass", "electric"));
        SYNONYMS.put("piano", List.of("music", "instrument", "keyboard", "performance", "classical"));
        SYNONYMS.put("singing", List.of("music", "vocals", "voice", "performance", "choir"));
        SYNONYMS.put("vocals", List.of("singing", "music", "voice", "performance"));
        SYNONYMS.put("drums", List.of("music", "instrument", "percussion", "performance", "rhythm"));
        SYNONYMS.put("instrument", List.of("music", "guitar", "piano", "drums", "performance"));
        SYNONYMS.put("audio", List.of("music", "production", "sound", "recording", "podcast"));
        SYNONYMS.put("podcast", List.of("audio", "speaking", "communication", "recording", "media"));
        SYNONYMS.put("production", List.of("music", "video", "film", "audio", "media", "creative"));
        SYNONYMS.put("dance", List.of("performance", "music", "art", "choreography", "movement"));
        SYNONYMS.put("acting", List.of("performance", "film", "drama", "theater", "voice"));
        SYNONYMS.put("theater", List.of("acting", "performance", "drama", "stage", "play"));

        // ── Communication & Language ───────────────────────────────
        SYNONYMS.put("writing", List.of("content", "communication", "marketing", "language", "copywriting", "english"));
        SYNONYMS.put("language", List.of("writing", "speaking", "communication", "translation", "english", "ielts"));
        SYNONYMS.put("english", List.of("writing", "language", "communication", "ielts", "speaking", "grammar"));
        SYNONYMS.put("ielts", List.of("english", "writing", "language", "communication", "test", "exam"));
        SYNONYMS.put("speaking", List.of("communication", "public", "presentation", "language", "english", "debate"));
        SYNONYMS.put("public", List.of("speaking", "communication", "presentation", "leadership"));
        SYNONYMS.put("communication", List.of("speaking", "writing", "presentation", "language", "english"));
        SYNONYMS.put("presentation", List.of("speaking", "public", "communication", "powerpoint", "storytelling"));
        SYNONYMS.put("translation", List.of("language", "writing", "communication", "interpretation"));
        SYNONYMS.put("debate", List.of("speaking", "communication", "public", "argumentation", "critical"));
        SYNONYMS.put("content", List.of("writing", "marketing", "social", "media", "blog", "copywriting"));
        SYNONYMS.put("copywriting", List.of("writing", "content", "marketing", "advertising"));
        SYNONYMS.put("blogging", List.of("writing", "content", "marketing", "social", "media"));
        SYNONYMS.put("storytelling", List.of("writing", "presentation", "speaking", "communication", "content"));

        // ── Business & Finance ─────────────────────────────────────
        SYNONYMS.put("marketing", List.of("content", "writing", "business", "brand", "social", "digital", "advertising"));
        SYNONYMS.put("business", List.of("marketing", "management", "finance", "entrepreneurship", "startup"));
        SYNONYMS.put("finance", List.of("business", "accounting", "money", "investment", "economics"));
        SYNONYMS.put("accounting", List.of("finance", "business", "excel", "money", "audit"));
        SYNONYMS.put("management", List.of("business", "leadership", "project", "team", "organization"));
        SYNONYMS.put("leadership", List.of("management", "business", "communication", "team", "project"));
        SYNONYMS.put("entrepreneurship", List.of("business", "startup", "innovation", "management"));
        SYNONYMS.put("investment", List.of("finance", "business", "stock", "money", "economics"));
        SYNONYMS.put("economics", List.of("finance", "business", "investment", "analysis"));

        // ── Interview & Career ─────────────────────────────────────
        SYNONYMS.put("interview", List.of("career", "communication", "preparation", "speaking", "resume"));
        SYNONYMS.put("resume", List.of("career", "writing", "interview", "cv", "job"));
        SYNONYMS.put("career", List.of("interview", "resume", "job", "management", "business"));
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
            // Tech core
            case "react", "frontend", "backend", "python", "data", "science", "design", "marketing" -> 1.4;
            // Creative / arts / film
            case "cinematography", "film", "video", "photography", "camera", "editing", "animation" -> 1.4;
            // Music
            case "music", "guitar", "piano", "singing", "vocals", "audio", "production" -> 1.4;
            // Communication & language
            case "english", "ielts", "speaking", "writing", "communication", "presentation" -> 1.4;
            // Business
            case "business", "finance", "management", "leadership", "entrepreneurship" -> 1.4;
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
