package com.skillex.service.match;

import com.skillex.config.IntentMatchingProperties;
import com.skillex.service.embedding.TextEmbeddingProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.StringJoiner;

/**
 * Two-layer cache for intent-document embeddings:
 * 1) in-memory LRU (fast path)
 * 2) optional Redis cache (survives restart, 24h TTL by default)
 */
@Component
@Slf4j
public class IntentEmbeddingCache {

    private final TextEmbeddingProvider embeddingProvider;
    private final IntentMatchingProperties properties;
    private final ObjectProvider<StringRedisTemplate> redisTemplateProvider;

    public IntentEmbeddingCache(TextEmbeddingProvider embeddingProvider,
                                IntentMatchingProperties properties,
                                ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.embeddingProvider = embeddingProvider;
        this.properties = properties;
        this.redisTemplateProvider = redisTemplateProvider;
    }

    private final Map<String, double[]> cache = Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, double[]> eldest) {
            return size() > Math.max(512, properties.getEmbeddingCacheMaxEntries());
        }
    });

    public double[] embed(String normalizedDoc) {
        if (normalizedDoc == null || normalizedDoc.isBlank()) {
            return null;
        }

        double[] memoryHit = cache.get(normalizedDoc);
        if (memoryHit != null) {
            return memoryHit;
        }

        if (properties.isRedisEnabled()) {
            double[] redisHit = readRedis(normalizedDoc);
            if (redisHit != null) {
                cache.put(normalizedDoc, redisHit);
                return redisHit;
            }
        }

        double[] computed = embeddingProvider.embed(normalizedDoc);
        cache.put(normalizedDoc, computed);

        if (properties.isRedisEnabled()) {
            writeRedis(normalizedDoc, computed);
        }

        return computed;
    }

    private double[] readRedis(String normalizedDoc) {
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (redis == null) {
            return null;
        }

        try {
            String raw = redis.opsForValue().get(redisKey(normalizedDoc));
            if (raw == null || raw.isBlank()) {
                return null;
            }
            return decodeVector(raw);
        } catch (Exception ex) {
            log.debug("Intent embedding Redis read failed, falling back to compute: {}", ex.getMessage());
            return null;
        }
    }

    private void writeRedis(String normalizedDoc, double[] vector) {
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (redis == null || vector == null || vector.length == 0) {
            return;
        }

        long ttlHours = Math.max(1L, properties.getRedisTtlHours());
        try {
            redis.opsForValue().set(
                redisKey(normalizedDoc),
                encodeVector(vector),
                Duration.ofHours(ttlHours)
            );
        } catch (Exception ex) {
            log.debug("Intent embedding Redis write failed, continuing without Redis cache: {}", ex.getMessage());
        }
    }

    private String redisKey(String normalizedDoc) {
        String model = embeddingProvider.modelName();
        return properties.getRedisKeyPrefix() + ":" + model + ":" + sha256(normalizedDoc);
    }

    private String encodeVector(double[] vector) {
        StringJoiner joiner = new StringJoiner(",");
        for (double value : vector) {
            joiner.add(Double.toString(value));
        }
        return joiner.toString();
    }

    private double[] decodeVector(String raw) {
        String[] parts = raw.split(",");
        if (parts.length == 0) {
            return null;
        }

        double[] vector = new double[parts.length];
        for (int i = 0; i < parts.length; i++) {
            vector[i] = Double.parseDouble(parts[i]);
        }
        return vector;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm not available", ex);
        }
    }
}
