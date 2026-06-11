package com.skillex.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.ai.ProfileAssistantSuggestionDto;
import com.skillex.service.ProfileAssistantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileAssistantServiceImpl implements ProfileAssistantService {

    private final ObjectMapper objectMapper;

    @Value("${app.ai.notes.provider:gemma}")
    private String aiProvider;

    @Value("${app.ai.gemma.url:http://localhost:11434/api/generate}")
    private String gemmaUrl;

    @Value("${app.ai.gemma.model:gemma2}")
    private String gemmaModel;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    @Override
    public ProfileAssistantSuggestionDto suggestBios(String topic) {
        log.info("[Profile Assistant] Generating bio suggestions for topic: {}", topic);
        String prompt = buildBioPrompt(topic);
        List<String> suggestions = callOllamaForSuggestions(prompt, 3);
        return new ProfileAssistantSuggestionDto(suggestions, TIME_FMT.format(LocalDateTime.now()), gemmaModel);
    }

    @Override
    public ProfileAssistantSuggestionDto suggestSkillDescriptions(String skillName, String level) {
        log.info("[Profile Assistant] Generating skill descriptions for: {} ({})", skillName, level);
        String prompt = buildSkillDescriptionPrompt(skillName, level);
        List<String> suggestions = callOllamaForSuggestions(prompt, 3);
        return new ProfileAssistantSuggestionDto(suggestions, TIME_FMT.format(LocalDateTime.now()), gemmaModel);
    }

    @Override
    public ProfileAssistantSuggestionDto suggestCircleBlurbs(String circleName, String topic) {
        log.info("[Profile Assistant] Generating circle blurbs for: {} (topic: {})", circleName, topic);
        String prompt = buildCircleBlurbPrompt(circleName, topic);
        List<String> suggestions = callOllamaForSuggestions(prompt, 3);
        return new ProfileAssistantSuggestionDto(suggestions, TIME_FMT.format(LocalDateTime.now()), gemmaModel);
    }

    /**
     * Prompt to generate 3 distinct, polished professional bios from a user's rough description.
     */
    private String buildBioPrompt(String topic) {
        return """
                You are an expert professional writer helping someone craft their bio for a skill-sharing platform.
                The user has provided this rough self-description:

                "%s"

                Generate exactly 3 distinct, polished, professional bios (each 1-2 sentences) that:
                - Highlight key strengths and interests clearly
                - Sound authentic and personable
                - Are distinct from each other in style and focus
                - Are suitable for a professional skill-sharing profile

                Return ONLY a valid JSON array with no markdown, no extra text. Each element must be a plain string.
                Example format: ["First bio here.", "Second bio here.", "Third bio here."]
                """.formatted(topic);
    }

    /**
     * Prompt to generate 3 polished skill descriptions from skill name and level.
     */
    private String buildSkillDescriptionPrompt(String skillName, String level) {
        return """
                You are an expert at writing skill descriptions for a skill-sharing platform.
                Generate exactly 3 distinct, compelling descriptions for this skill:

                Skill: %s
                Level: %s

                Each description should:
                - Be 1-2 sentences
                - Explain what the skill covers and its practical value
                - Be specific to the given proficiency level
                - Sound professional but friendly
                - Reflect real-world applications

                Return ONLY a valid JSON array with no markdown, no extra text. Each element must be a plain string.
                Example format: ["First description.", "Second description.", "Third description."]
                """.formatted(skillName, level);
    }

    /**
     * Prompt to generate 3 compelling circle/group blurbs.
     */
    private String buildCircleBlurbPrompt(String circleName, String topic) {
        return """
                You are an expert community manager writing engaging group descriptions for a skill-sharing platform.
                Generate exactly 3 distinct, compelling blurbs for this circle/group:

                Circle Name: %s
                Main Topic: %s

                Each blurb should:
                - Be 1-2 sentences
                - Be welcoming and clear about the group's focus
                - Highlight what members can learn or gain
                - Be distinct in tone and emphasis
                - Sound engaging and inviting

                Return ONLY a valid JSON array with no markdown, no extra text. Each element must be a plain string.
                Example format: ["First blurb here.", "Second blurb here.", "Third blurb here."]
                """.formatted(circleName, topic);
    }

    /**
     * Call Ollama to generate suggestions and parse the JSON array response.
     * On failure, returns placeholder suggestions.
     */
    private List<String> callOllamaForSuggestions(String prompt, int expectedCount) {
        try {
            log.debug("[Profile Assistant] Calling Ollama at {} with {} chars prompt", gemmaUrl, prompt.length());

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            Map<String, Object> options = Map.of(
                    "temperature", 0.7,
                    "num_ctx", 2048,
                    "num_predict", 512
            );

            Map<String, Object> body = Map.of(
                    "model", gemmaModel,
                    "prompt", prompt,
                    "stream", false,
                    "options", options
            );

            String payload = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gemmaUrl))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String responseText = root.path("response").asText("");
                return parseJsonArray(responseText, expectedCount);
            }

            log.error("[Profile Assistant] Ollama call failed. Status: {}", response.statusCode());
            return generatePlaceholderSuggestions(expectedCount);

        } catch (Exception e) {
            log.error("[Profile Assistant] Ollama connection failed. Using placeholders.", e);
            return generatePlaceholderSuggestions(expectedCount);
        }
    }

    /**
     * Parse JSON array from model response. Robustly handles various formats.
     */
    private List<String> parseJsonArray(String response, int expectedCount) {
        if (response == null || response.isBlank()) {
            return generatePlaceholderSuggestions(expectedCount);
        }

        try {
            String cleaned = response.trim();

            // Extract JSON array between [ and ]
            int start = cleaned.indexOf('[');
            int end = cleaned.lastIndexOf(']');

            if (start != -1 && end != -1 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }

            JsonNode parsed = objectMapper.readTree(cleaned);
            if (parsed.isArray()) {
                List<String> suggestions = new ArrayList<>();
                for (JsonNode item : parsed) {
                    String suggestion = item.asText("").trim();
                    if (!suggestion.isBlank() && suggestions.size() < expectedCount) {
                        suggestions.add(suggestion);
                    }
                }
                if (suggestions.size() >= expectedCount) {
                    return suggestions.subList(0, expectedCount);
                }
                if (!suggestions.isEmpty()) {
                    return suggestions;
                }
            }
        } catch (Exception e) {
            log.warn("[Profile Assistant] Failed to parse JSON array from model response", e);
        }

        return generatePlaceholderSuggestions(expectedCount);
    }

    /**
     * Generate placeholder suggestions when AI is unavailable.
     */
    private List<String> generatePlaceholderSuggestions(int count) {
        List<String> placeholders = new ArrayList<>();
        placeholders.add("A skilled professional with deep expertise and a passion for knowledge sharing.");
        placeholders.add("Experienced practitioner dedicated to learning and teaching others in the community.");
        placeholders.add("Enthusiastic participant committed to growing both personally and helping others succeed.");

        return placeholders.stream().limit(count).toList();
    }
}
