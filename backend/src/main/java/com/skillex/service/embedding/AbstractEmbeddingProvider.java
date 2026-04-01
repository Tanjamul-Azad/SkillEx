package com.skillex.service.embedding;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Base class for embedding providers.
 * Provides in-memory caching and vector normalization.
 */
public abstract class AbstractEmbeddingProvider implements TextEmbeddingProvider {

    private final Map<String, double[]> embeddingCache = new ConcurrentHashMap<>();

    @Override
    public final double[] getEmbedding(String text) {
        String normalized = text == null ? "" : text.trim();
        return embeddingCache.computeIfAbsent(normalized, this::computeEmbedding);
    }

    /**
     * Subclasses compute the raw embedding vector.
     */
    protected abstract double[] computeEmbedding(String text);

    /**
     * Clears provider cache; used by scheduled refresh jobs/tests.
     */
    public void clearCache() {
        embeddingCache.clear();
    }

    /**
     * L2-normalize a vector in-place.
     */
    protected double[] normalize(double[] vector) {
        if (vector == null || vector.length == 0) {
            return new double[0];
        }
        double norm = 0.0;
        for (double value : vector) {
            norm += value * value;
        }
        norm = Math.sqrt(norm);
        if (norm == 0.0) {
            return vector;
        }
        for (int i = 0; i < vector.length; i++) {
            vector[i] /= norm;
        }
        return vector;
    }
}
