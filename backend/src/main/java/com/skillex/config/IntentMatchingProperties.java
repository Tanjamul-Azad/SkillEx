package com.skillex.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Externalized settings for intent/tag matching behavior.
 */
@Component
@ConfigurationProperties(prefix = "app.matching.intent")
@Getter
@Setter
public class IntentMatchingProperties {

    /** Candidate pool multiplier: poolSize = limit * candidatePoolFactor. */
    private int candidatePoolFactor = 4;

    /** Match-reason threshold for showing user-facing intent reason text. */
    private double reasonThreshold = 0.25;

    /** In-memory max entries for intent embedding cache. */
    private int embeddingCacheMaxEntries = 4000;

    /** Optional Redis cache for cross-restart embedding reuse. */
    private boolean redisEnabled = false;
    private long redisTtlHours = 24;
    private String redisKeyPrefix = "skillex:intent-embedding";

    /** Hybrid weighting of lexical overlap and embedding cosine. */
    private double lexicalWeight = 0.40;
    private double embeddingWeight = 0.60;

    /** Normalization + stop word settings, configurable for Bangla-English mix. */
    private List<String> stopWords = new ArrayList<>(List.of(
        "i", "we", "to", "the", "a", "an", "and", "or", "with", "for", "of", "in", "on", "at", "my",
        "our", "want", "learn", "teach", "need", "help", "from", "by", "can", "be", "how", "about",
        "ami", "amra", "amii", "chai", "shikhte", "shekhate", "ki", "kibhabe", "amar", "amader"
    ));

    private Map<String, String> synonyms = new HashMap<>(Map.ofEntries(
        Map.entry("crafting", "craft"),
        Map.entry("crafts", "craft"),
        Map.entry("diy", "craft"),
        Map.entry("handmade", "craft"),
        Map.entry("upcycle", "recycle"),
        Map.entry("upcycling", "recycle"),
        Map.entry("recycled", "recycle"),
        Map.entry("recycling", "recycle"),
        Map.entry("scrap", "recycle"),
        Map.entry("trash", "recycle"),
        Map.entry("waste", "recycle"),
        Map.entry("useless", "recycle"),
        Map.entry("household", "home"),
        Map.entry("ghorer", "home"),
        Map.entry("basha", "home"),
        Map.entry("oporojonio", "recycle")
    ));
}
