package com.skillex.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.ActionItemDto;
import com.skillex.dto.FlashcardDto;
import com.skillex.dto.QuizQuestionDto;
import com.skillex.dto.StudyMaterialDto;
import com.skillex.model.Session;
import com.skillex.model.SessionNote;
import com.skillex.repository.SessionNoteRepository;
import com.skillex.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlashcardGeneratorServiceImpl implements FlashcardGeneratorService {

    private final SessionNoteRepository noteRepository;
    private final SessionRepository sessionRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.notes.provider:gemma}")
    private String aiProvider;

    @Value("${app.ai.gemma.url:http://localhost:11434/api/generate}")
    private String gemmaUrl;

    @Value("${app.ai.gemma.model:gemma2}")
    private String gemmaModel;

    @Value("${app.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Override
    @Transactional
    public StudyMaterialDto generateStudyMaterials(String sessionId) {
        log.info("[Flashcard] Initiating study material generation for session {}", sessionId);

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        SessionNote note = noteRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session notes not found: " + sessionId));

        if (note.isEmpty()) {
            log.warn("[Flashcard] Session notes are empty. Returning empty study materials.");
            return new StudyMaterialDto(
                    sessionId,
                    getSkillName(session),
                    List.of(),
                    List.of(),
                    List.of(),
                    LocalDateTime.now()
            );
        }

        String extractionPrompt = createExtractionPrompt(session, note);
        String aiResponse;

        if ("gemini".equalsIgnoreCase(aiProvider) && geminiApiKey != null && !geminiApiKey.isBlank()) {
            aiResponse = callGeminiApi(extractionPrompt);
        } else {
            aiResponse = callGemmaRawOrEmpty(extractionPrompt);
        }

        if (aiResponse == null || aiResponse.isBlank()) {
            log.warn("[Flashcard] AI model returned no response. Generating fallback materials.");
            return generateFallbackStudyMaterials(session, note);
        }

        return parseStudyMaterials(sessionId, session, aiResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<StudyMaterialDto> getStudyMaterials(String sessionId) {
        // Future enhancement: cache study materials in SessionNote entity
        // For now, this is a placeholder for consistency with the interface
        try {
            return Optional.of(generateStudyMaterials(sessionId));
        } catch (Exception e) {
            log.error("[Flashcard] Failed to retrieve study materials for session {}", sessionId, e);
            return Optional.empty();
        }
    }

    /**
     * Creates the extraction prompt with clear instructions for the LLM.
     */
    private String createExtractionPrompt(Session session, SessionNote note) {
        String skillName = getSkillName(session);
        String sourceText = note.getDetailedNotes() != null && !note.getDetailedNotes().isBlank()
                ? note.getDetailedNotes()
                : (note.getKeyConcepts() != null && !note.getKeyConcepts().isBlank()
                ? note.getKeyConcepts()
                : note.getSummary());

        return """
                You are an expert educational content designer extracting learning materials from session notes.
                Skill topic: %s

                Based on the session notes below, extract and structure:
                1. 5-8 flashcards (term + definition pairs for spaced repetition)
                2. 3-4 multiple-choice quiz questions (practical, with explanations)
                3. 2-3 action items (concrete next steps with owners: "Learner" or "Teacher")

                Instructions:
                - Flashcards: Use concise, definition-like text. Assign difficulty (EASY, MEDIUM, or HARD).
                - Quiz questions: Create practical questions with 4 choices. Include brief explanations.
                - Action items: Be specific and actionable. Suggest realistic deadlines (1-7 days ahead).
                - Output: ONLY valid JSON (no markdown, no extra text, escaped newlines as \\n).

                JSON schema (field order matters):
                {
                  "flashcards": [
                    {
                      "id": "fc-1",
                      "term": "The concept being learned",
                      "definition": "Clear, concise explanation or definition",
                      "difficulty": "EASY|MEDIUM|HARD"
                    }
                  ],
                  "quizQuestions": [
                    {
                      "id": "q-1",
                      "question": "The multiple-choice question stem",
                      "choices": ["Option A", "Option B", "Option C", "Option D"],
                      "correctAnswerIndex": 0,
                      "explanation": "Why this answer is correct and others are not",
                      "difficulty": "EASY|MEDIUM|HARD"
                    }
                  ],
                  "actionItems": [
                    {
                      "id": "ai-1",
                      "description": "Specific task to complete",
                      "owner": "Learner|Teacher",
                      "dueDate": "2026-06-18",
                      "priority": "LOW|MEDIUM|HIGH"
                    }
                  ]
                }

                Session notes to extract from:
                %s
                """.formatted(skillName, sourceText);
    }

    /**
     * Parses the AI response into structured StudyMaterialDto.
     */
    private StudyMaterialDto parseStudyMaterials(String sessionId, Session session, String aiResponse) {
        try {
            // Extract JSON from response (handle markdown fences and extra text)
            String jsonBody = extractJson(aiResponse);
            JsonNode root = objectMapper.readTree(jsonBody);

            List<FlashcardDto> flashcards = parseFlashcards(root.path("flashcards"));
            List<QuizQuestionDto> quizQuestions = parseQuizQuestions(root.path("quizQuestions"));
            List<ActionItemDto> actionItems = parseActionItems(root.path("actionItems"));

            log.info("[Flashcard] Generated {} flashcards, {} questions, {} action items for session {}",
                    flashcards.size(), quizQuestions.size(), actionItems.size(), sessionId);

            return new StudyMaterialDto(
                    sessionId,
                    getSkillName(session),
                    flashcards,
                    quizQuestions,
                    actionItems,
                    LocalDateTime.now()
            );
        } catch (Exception e) {
            log.error("[Flashcard] Failed to parse study materials from AI response", e);
            throw new RuntimeException("Failed to parse study materials: " + e.getMessage());
        }
    }

    /**
     * Extracts JSON from a response that might contain markdown or extra text.
     */
    private String extractJson(String response) {
        String trimmed = response.trim();

        // Remove markdown fences
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").trim();
        }

        // Extract JSON substring between first { and last }
        int firstBrace = trimmed.indexOf('{');
        int lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            trimmed = trimmed.substring(firstBrace, lastBrace + 1);
        }

        return trimmed;
    }

    /**
     * Parses flashcards from JSON node.
     */
    private List<FlashcardDto> parseFlashcards(JsonNode node) {
        List<FlashcardDto> result = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return result;
        }

        int index = 0;
        for (JsonNode item : node) {
            try {
                String id = item.path("id").asText("fc-" + (++index));
                String term = item.path("term").asText("");
                String definition = item.path("definition").asText("");
                String difficulty = item.path("difficulty").asText("MEDIUM");

                if (!term.isBlank() && !definition.isBlank()) {
                    result.add(new FlashcardDto(id, term, definition, difficulty));
                }
            } catch (Exception e) {
                log.warn("[Flashcard] Skipped invalid flashcard entry", e);
            }
        }
        return result;
    }

    /**
     * Parses quiz questions from JSON node.
     */
    private List<QuizQuestionDto> parseQuizQuestions(JsonNode node) {
        List<QuizQuestionDto> result = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return result;
        }

        int index = 0;
        for (JsonNode item : node) {
            try {
                String id = item.path("id").asText("q-" + (++index));
                String question = item.path("question").asText("");
                int correctIdx = item.path("correctAnswerIndex").asInt(0);
                String explanation = item.path("explanation").asText("");
                String difficulty = item.path("difficulty").asText("MEDIUM");

                List<String> choices = new ArrayList<>();
                JsonNode choicesNode = item.path("choices");
                if (choicesNode.isArray()) {
                    choicesNode.forEach(choice -> choices.add(choice.asText("")));
                }

                if (!question.isBlank() && choices.size() >= 2) {
                    result.add(new QuizQuestionDto(id, question, choices, correctIdx, explanation, difficulty));
                }
            } catch (Exception e) {
                log.warn("[Flashcard] Skipped invalid quiz question entry", e);
            }
        }
        return result;
    }

    /**
     * Parses action items from JSON node.
     */
    private List<ActionItemDto> parseActionItems(JsonNode node) {
        List<ActionItemDto> result = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return result;
        }

        int index = 0;
        for (JsonNode item : node) {
            try {
                String id = item.path("id").asText("ai-" + (++index));
                String description = item.path("description").asText("");
                String owner = item.path("owner").asText("Learner");
                String dateStr = item.path("dueDate").asText("");
                String priority = item.path("priority").asText("MEDIUM");

                LocalDate dueDate = null;
                if (!dateStr.isBlank()) {
                    try {
                        dueDate = LocalDate.parse(dateStr);
                    } catch (Exception ignored) {
                        // Default to 3 days from now if parsing fails
                        dueDate = LocalDate.now().plusDays(3);
                    }
                } else {
                    dueDate = LocalDate.now().plusDays(3);
                }

                if (!description.isBlank()) {
                    result.add(new ActionItemDto(id, description, owner, dueDate, priority));
                }
            } catch (Exception e) {
                log.warn("[Flashcard] Skipped invalid action item entry", e);
            }
        }
        return result;
    }

    /**
     * Generates fallback study materials when AI extraction fails.
     * Extracts basic structures from existing note content.
     */
    private StudyMaterialDto generateFallbackStudyMaterials(Session session, SessionNote note) {
        String sessionId = session.getId();

        // Create basic flashcards from key concepts
        List<FlashcardDto> flashcards = new ArrayList<>();
        if (note.getKeyConcepts() != null && !note.getKeyConcepts().isBlank()) {
            String[] concepts = note.getKeyConcepts().split("\n");
            int index = 1;
            for (String concept : concepts) {
                String trimmed = concept.replaceFirst("^-\\s*", "").trim();
                if (!trimmed.isBlank()) {
                    flashcards.add(new FlashcardDto(
                            "fc-" + index,
                            trimmed.length() > 50 ? trimmed.substring(0, 50) : trimmed,
                            "Concept from session: " + trimmed,
                            "MEDIUM"
                    ));
                    if (++index > 8) break;
                }
            }
        }

        // Create basic action items from action items field
        List<ActionItemDto> actionItems = new ArrayList<>();
        if (note.getActionItems() != null && !note.getActionItems().isBlank()) {
            String[] items = note.getActionItems().split("\n");
            int index = 1;
            for (String item : items) {
                String trimmed = item.replaceFirst("^-\\s*", "").trim();
                if (!trimmed.isBlank()) {
                    actionItems.add(new ActionItemDto(
                            "ai-" + index,
                            trimmed,
                            "Learner",
                            LocalDate.now().plusDays(3),
                            "MEDIUM"
                    ));
                    if (++index > 3) break;
                }
            }
        }

        // Quiz questions require more intelligence; skip in fallback
        List<QuizQuestionDto> quizQuestions = List.of();

        return new StudyMaterialDto(
                sessionId,
                getSkillName(session),
                flashcards,
                quizQuestions,
                actionItems,
                LocalDateTime.now()
        );
    }

    /**
     * Calls Gemma (local Ollama) API for flashcard extraction.
     */
    private String callGemmaRawOrEmpty(String prompt) {
        log.info("[Flashcard] Dispatching extraction prompt to Ollama model '{}' ({} chars)", gemmaModel, prompt.length());
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            Map<String, Object> options = Map.of(
                    "temperature", 0.2,
                    "num_ctx", 8192,
                    "num_predict", 2048
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
                    .timeout(Duration.ofSeconds(180))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                return root.path("response").asText("");
            }

            log.error("[Flashcard] Ollama call failed. Status: {}", response.statusCode());
            return "";
        } catch (Exception e) {
            log.error("[Flashcard] Ollama connection failed. Ensure Ollama is running.", e);
            return "";
        }
    }

    /**
     * Calls Gemini Cloud API for flashcard extraction.
     */
    private String callGeminiApi(String prompt) {
        log.info("[Flashcard] Dispatching extraction prompt to Gemini Cloud API");
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;
            HttpClient client = HttpClient.newHttpClient();

            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> parts = Map.of("parts", List.of(textPart));
            Map<String, Object> contentObj = Map.of("contents", List.of(parts));
            String payload = objectMapper.writeValueAsString(contentObj);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                return root.path("candidates")
                        .path(0)
                        .path("content")
                        .path("parts")
                        .path(0)
                        .path("text")
                        .asText("");
            }

            log.error("[Flashcard] Gemini API failed. Status: {}", response.statusCode());
            return "";
        } catch (Exception e) {
            log.error("[Flashcard] Gemini Cloud connection failed", e);
            return "";
        }
    }

    /**
     * Helper to safely get skill name from session.
     */
    private String getSkillName(Session session) {
        if (session != null && session.getSkill() != null && session.getSkill().getName() != null) {
            return session.getSkill().getName();
        }
        return "Skill Exchange";
    }
}
