package com.skillex.service.embedding;

/**
 * Abstraction for turning skill text into dense vectors.
 *
 * <p>The first implementation is a local hashing-based embedder so the project
 * can run fully offline. A future API-backed provider can replace it without
 * changing the match engine.
 */
public interface TextEmbeddingProvider {

    String modelName();

    int dimensions();

    double[] embed(String text);
}
