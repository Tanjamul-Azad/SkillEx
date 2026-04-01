package com.skillex.service.embedding;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class AbstractEmbeddingProviderTest {

    @Test
    void shouldCacheEmbeddingResults() {
        LocalProvider provider = new LocalProvider();

        double[] first = provider.getEmbedding("hello");
        double[] second = provider.getEmbedding("hello");

        assertArrayEquals(first, second, 0.0001);
        assertEquals(1, provider.invocations);
    }

    @Test
    void shouldNormalizeVectors() {
        LocalProvider provider = new LocalProvider();
        double[] vec = provider.getEmbedding("x");

        assertEquals(0.6, vec[0], 0.0001);
        assertEquals(0.8, vec[1], 0.0001);
    }

    private static class LocalProvider extends AbstractEmbeddingProvider {

        private int invocations = 0;

        @Override
        public String modelName() {
            return "local-test";
        }

        @Override
        public int dimensions() {
            return 2;
        }

        @Override
        protected double[] computeEmbedding(String text) {
            invocations++;
            return normalize(new double[]{3.0, 4.0});
        }
    }
}
