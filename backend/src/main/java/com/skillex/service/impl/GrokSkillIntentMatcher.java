package com.skillex.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;
import com.skillex.dto.skill.SkillIntentInterpretResultDto;
import com.skillex.dto.skill.SkillIntentSuggestionDto;
import com.skillex.model.Skill;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class GrokSkillIntentMatcher {

    private static final String XAI_ENDPOINT = "https://api.x.ai/v1/chat/completions";
    private static final String GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
    private static final int MAX_SUGGESTIONS = 3;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    @Value("${app.ai.grok.enabled:true}")
    private boolean enabled;

    @Value("${app.ai.grok.api-key:}")
    private String apiKey;

    @Value("${app.ai.grok.endpoint:}")
    private String endpoint;

    @Value("${app.ai.grok.model:grok-4.3}")
    private String model;

    @Value("${app.ai.grok.timeout-ms:12000}")
    private int timeoutMs;

    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public Optional<SkillIntentInterpretResponse> interpret(SkillIntentInterpretRequest request, List<Skill> catalog) {
        if (!isConfigured() || request == null || catalog == null || catalog.isEmpty()) {
            return Optional.empty();
        }
        if (isBlank(request.teachText()) && isBlank(request.learnText())) {
            return Optional.empty();
        }

        try {
            JsonNode root = callGrok(request, catalog);
            Map<String, Skill> skillsById = new HashMap<>();
            Map<String, Skill> skillsByName = new HashMap<>();
            for (Skill skill : catalog) {
                skillsById.put(skill.getId(), skill);
                skillsByName.put(normalize(skill.getName()), skill);
            }

            SkillIntentInterpretResultDto teach = parseSide(
                request.teachText(),
                root.path("teach"),
                skillsById,
                skillsByName
            );
            SkillIntentInterpretResultDto learn = parseSide(
                request.learnText(),
                root.path("learn"),
                skillsById,
                skillsByName
            );

            return Optional.of(new SkillIntentInterpretResponse(teach, learn));
        } catch (Exception ex) {
            log.warn("[GrokSkillIntent] Falling back to offline matching: {}", ex.getMessage());
            log.debug("[GrokSkillIntent] Grok failure detail", ex);
            return Optional.empty();
        }
    }

    private JsonNode callGrok(SkillIntentInterpretRequest request, List<Skill> catalog) throws Exception {
        var payload = objectMapper.createObjectNode();
        payload.put("model", effectiveModel());
        payload.put("stream", false);
        payload.put("temperature", 0.1);
        payload.put("max_tokens", 900);

        var messages = objectMapper.createArrayNode();
        messages.add(objectMapper.createObjectNode()
            .put("role", "system")
            .put("content", systemPrompt()));
        messages.add(objectMapper.createObjectNode()
            .put("role", "user")
            .put("content", userPrompt(request, catalog)));
        payload.set("messages", messages);
        payload.set("response_format", responseFormat());

        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(effectiveEndpoint()))
            .timeout(Duration.ofMillis(Math.max(2000, timeoutMs)))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
            .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String body = response.body() == null ? "" : response.body();
            String snippet = body.length() > 240 ? body.substring(0, 240) + "..." : body;
            throw new IllegalStateException("Grok request failed with HTTP " + response.statusCode() + ": " + snippet);
        }

        JsonNode chat = objectMapper.readTree(response.body());
        String content = chat.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) {
            throw new IllegalStateException("Grok response content was empty.");
        }
        return objectMapper.readTree(content);
    }

    private String systemPrompt() {
        return """
            You are the skill intent matcher for SkillEX, a peer-to-peer skill exchange app.
            Match natural-language teach/learn text to the provided skill catalog.
            Prefer catalog skills only when the meaning is actually relevant.
            Do not force weak matches. If the catalog has no good match, create a concise custom skill.
            Be especially careful with software terms: API, AI, ML, LLM, frontend, backend, React, TypeScript, Next.js.
            Return only JSON that matches the requested schema.
            The top-level JSON object must contain exactly these keys: teach, learn.
            Each side must contain inferredLevel and suggestions.
            Confidence rules:
            90-100 exact or very strong semantic match.
            70-89 clear but broader match.
            45-69 custom or partial match.
            Below 45 only when there is very little signal.
            """;
    }

    private String userPrompt(SkillIntentInterpretRequest request, List<Skill> catalog) throws Exception {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("teachText", nullToEmpty(request.teachText()));
        input.put("learnText", nullToEmpty(request.learnText()));
        input.put("catalog", catalog.stream()
            .sorted(Comparator.comparing(Skill::getName, String.CASE_INSENSITIVE_ORDER))
            .map(skill -> {
                Map<String, String> item = new LinkedHashMap<>();
                item.put("skillId", skill.getId());
                item.put("skillName", skill.getName());
                item.put("category", skill.getCategory());
                item.put("description", skill.getDescription());
                return item;
            })
            .toList());

        return "Classify this skill intent. For each non-empty side, return up to 3 suggestions. "
            + "For catalog matches, use the exact skillId and skillName from catalog. "
            + "For custom skills, set skillId to null and custom to true.\n\n"
            + objectMapper.writeValueAsString(input);
    }

    private String effectiveEndpoint() {
        if (endpoint != null && !endpoint.isBlank()) {
            return endpoint.trim();
        }
        return isGroqCloudKey() ? GROQ_ENDPOINT : XAI_ENDPOINT;
    }

    private String effectiveModel() {
        String configured = model == null || model.isBlank() ? "grok-4.3" : model.trim();
        if (isGroqCloudKey() && configured.startsWith("grok-")) {
            return GROQ_DEFAULT_MODEL;
        }
        return configured;
    }

    private boolean isGroqCloudKey() {
        return apiKey != null && apiKey.trim().startsWith("gsk_");
    }

    private JsonNode responseFormat() {
        if (isGroqCloudKey()) {
            var root = objectMapper.createObjectNode();
            root.put("type", "json_object");
            return root;
        }
        return responseFormatSchema();
    }

    private JsonNode responseFormatSchema() {
        var root = objectMapper.createObjectNode();
        root.put("type", "json_schema");

        var jsonSchema = objectMapper.createObjectNode();
        jsonSchema.put("name", "skill_intent_match");
        jsonSchema.put("strict", true);

        var schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.set("additionalProperties", objectMapper.getNodeFactory().booleanNode(false));
        schema.set("required", objectMapper.createArrayNode().add("teach").add("learn"));
        var properties = objectMapper.createObjectNode();
        properties.set("teach", sideSchema());
        properties.set("learn", sideSchema());
        schema.set("properties", properties);

        jsonSchema.set("schema", schema);
        root.set("json_schema", jsonSchema);
        return root;
    }

    private JsonNode sideSchema() {
        var side = objectMapper.createObjectNode();
        side.put("type", "object");
        side.set("additionalProperties", objectMapper.getNodeFactory().booleanNode(false));
        side.set("required", objectMapper.createArrayNode().add("inferredLevel").add("suggestions"));

        var properties = objectMapper.createObjectNode();
        var level = objectMapper.createObjectNode();
        level.put("type", "string");
        level.set("enum", objectMapper.createArrayNode().add("Beginner").add("Moderate").add("Expert"));
        properties.set("inferredLevel", level);

        var suggestions = objectMapper.createObjectNode();
        suggestions.put("type", "array");
        suggestions.put("maxItems", MAX_SUGGESTIONS);
        suggestions.set("items", suggestionSchema());
        properties.set("suggestions", suggestions);

        side.set("properties", properties);
        return side;
    }

    private JsonNode suggestionSchema() {
        var suggestion = objectMapper.createObjectNode();
        suggestion.put("type", "object");
        suggestion.set("additionalProperties", objectMapper.getNodeFactory().booleanNode(false));
        suggestion.set("required", objectMapper.createArrayNode()
            .add("skillId")
            .add("skillName")
            .add("category")
            .add("confidence")
            .add("custom"));

        var properties = objectMapper.createObjectNode();
        var skillId = objectMapper.createObjectNode();
        skillId.set("type", objectMapper.createArrayNode().add("string").add("null"));
        properties.set("skillId", skillId);
        properties.set("skillName", objectMapper.createObjectNode().put("type", "string"));
        properties.set("category", objectMapper.createObjectNode().put("type", "string"));
        properties.set("confidence", objectMapper.createObjectNode()
            .put("type", "integer")
            .put("minimum", 0)
            .put("maximum", 100));
        properties.set("custom", objectMapper.createObjectNode().put("type", "boolean"));
        suggestion.set("properties", properties);
        return suggestion;
    }

    private SkillIntentInterpretResultDto parseSide(
        String rawText,
        JsonNode side,
        Map<String, Skill> skillsById,
        Map<String, Skill> skillsByName
    ) {
        if (isBlank(rawText)) {
            return new SkillIntentInterpretResultDto(rawText, null, null, List.of());
        }

        String inferredLevel = normalizeLevel(side.path("inferredLevel").asText("Moderate"));
        List<SkillIntentSuggestionDto> suggestions = new ArrayList<>();
        JsonNode suggestionNodes = side.path("suggestions");
        if (suggestionNodes.isArray()) {
            for (JsonNode node : suggestionNodes) {
                sanitizeSuggestion(node, skillsById, skillsByName).ifPresent(suggestions::add);
                if (suggestions.size() >= MAX_SUGGESTIONS) {
                    break;
                }
            }
        }

        SkillIntentSuggestionDto primary = suggestions.isEmpty() ? null : suggestions.get(0);
        return new SkillIntentInterpretResultDto(rawText, inferredLevel, primary, List.copyOf(suggestions));
    }

    private Optional<SkillIntentSuggestionDto> sanitizeSuggestion(
        JsonNode node,
        Map<String, Skill> skillsById,
        Map<String, Skill> skillsByName
    ) {
        String skillId = blankToNull(node.path("skillId").asText(null));
        String skillName = blankToNull(node.path("skillName").asText(null));
        String category = blankToNull(node.path("category").asText(null));
        boolean custom = node.path("custom").asBoolean(false);
        int confidence = clamp(node.path("confidence").asInt(0), 0, 100);

        Skill catalogSkill = skillId == null ? null : skillsById.get(skillId);
        if (catalogSkill == null && skillName != null) {
            catalogSkill = skillsByName.get(normalize(skillName));
        }

        if (catalogSkill != null) {
            return Optional.of(new SkillIntentSuggestionDto(
                catalogSkill.getId(),
                catalogSkill.getName(),
                catalogSkill.getCategory(),
                confidence,
                false
            ));
        }

        if (skillName == null || skillName.length() < 2) {
            return Optional.empty();
        }

        return Optional.of(new SkillIntentSuggestionDto(
            null,
            skillName,
            category == null ? "Other" : category,
            confidence,
            true
        ));
    }

    private String normalizeLevel(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "beginner" -> "Beginner";
            case "expert" -> "Expert";
            default -> "Moderate";
        };
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
