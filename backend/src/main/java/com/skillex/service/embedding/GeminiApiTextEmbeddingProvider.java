package com.skillex.service.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Gemini API backed embedding provider.
 *
 * <p>Uses the public Gemini embeddings endpoint. If key/config is missing,
 * callers should use fallback logic instead of invoking this provider directly.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class GeminiApiTextEmbeddingProvider implements TextEmbeddingProvider {

    private final ObjectMapper objectMapper;

    @Value("${app.embedding.api.key:}")
    private String apiKey;

    @Value("${app.embedding.api.model:gemini-embedding-001}")
    private String model;

    @Value("${app.embedding.api.timeout-ms:8000}")
    private int timeoutMs;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    @Override
    public String modelName() {
        return model;
    }

    @Override
    public int dimensions() {
        // Gemini models can vary by model/version; return 0 and derive from result length.
        return 0;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public double[] embed(String text) {
        if (!isConfigured()) {
            throw new IllegalStateException("Gemini embedding API key is not configured.");
        }

        try {
            String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":embedContent";

            var payloadNode = objectMapper.createObjectNode();
            payloadNode.set("content", objectMapper.createObjectNode()
                .set("parts", objectMapper.createArrayNode()
                    .add(objectMapper.createObjectNode().put("text", text == null ? "" : text))));
            payloadNode.put("taskType", "SEMANTIC_SIMILARITY");
            String payload = payloadNode.toString();

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofMillis(Math.max(1000, timeoutMs)))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String body = response.body() == null ? "" : response.body();
                String snippet = body.length() > 240 ? body.substring(0, 240) + "..." : body;
                throw new IllegalStateException(
                    "Gemini embedding request failed with HTTP " + response.statusCode() + ": " + snippet
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode values = root.path("embedding").path("values");
            if (!values.isArray() || values.isEmpty()) {
                throw new IllegalStateException("Gemini embedding response has no vector values.");
            }

            double[] vector = new double[values.size()];
            for (int i = 0; i < values.size(); i++) {
                vector[i] = values.get(i).asDouble();
            }

            normalize(vector);
            return vector;
        } catch (IllegalStateException ex) {
            log.debug("[Embedding] Gemini API embed exception", ex);
            throw ex;
        } catch (Exception ex) {
            log.debug("[Embedding] Gemini API embed exception", ex);
            throw new IllegalStateException("Gemini embedding failed.", ex);
        }
    }

    private void normalize(double[] vector) {
        double norm = 0.0;
        for (double v : vector) {
            norm += v * v;
        }
        norm = Math.sqrt(norm);
        if (norm == 0.0) return;
        for (int i = 0; i < vector.length; i++) {
            vector[i] /= norm;
        }
    }
}
