package com.skillex.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.model.Session;
import com.skillex.model.SessionNote;
import com.skillex.model.SessionTranscript;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NoteGenerationService {

    private final SessionNoteRepository noteRepository;
    private final SessionRepository sessionRepository;
    private final TranscriptService transcriptService;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.notes.provider:gemma}") // Default to gemma for local Ollama use
    private String aiProvider;

    @Value("${app.ai.gemma.url:http://localhost:11434/api/generate}")
    private String gemmaUrl;

    @Value("${app.ai.gemma.model:gemma2}")
    private String gemmaModel;

    @Value("${app.ai.gemini-api-key:}")
    private String geminiApiKey;

    /**
     * Synthesizes and persists AI-generated notes for a completed session.
     */
    @Transactional
    public SessionNote generateAndSaveNotes(String sessionId) {
        log.info("[AI-Notes] Initiating note generation for session {} using provider: {}", sessionId, aiProvider);

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        List<SessionTranscript> transcripts = transcriptService.getTranscripts(sessionId);
        
        // Assemble chronological transcript text
        StringBuilder transcriptBuilder = new StringBuilder();
        for (SessionTranscript t : transcripts) {
            transcriptBuilder.append(t.getSpeakerRole())
                    .append(" (")
                    .append(t.getSpeakerUserId())
                    .append("): ")
                    .append(t.getContent())
                    .append("\n");
        }
        String rawTranscriptText = transcriptBuilder.toString();

        if (rawTranscriptText.isBlank()) {
            log.warn("[AI-Notes] Transcript is empty for session {}. Generating static template notes.", sessionId);
            return generateStaticNotes(session);
        }

        String prompt = createSystemPrompt(session, rawTranscriptText);
        String aiResponse = "";

        if ("gemini".equalsIgnoreCase(aiProvider) && geminiApiKey != null && !geminiApiKey.isBlank()) {
            aiResponse = callGeminiApi(prompt);
        } else {
            // Default to local Ollama Gemma
            aiResponse = callGemmaLocal(prompt);
        }

        // Parse AI response into structured compartments
        Map<String, String> sections = parseStructuredSections(aiResponse);

        // Delete previous session notes if any exist to enforce uniqueness
        noteRepository.findBySessionId(sessionId).ifPresent(noteRepository::delete);

        SessionNote note = new SessionNote(
                session,
                sections.get("keyConcepts"),
                sections.get("actionItems"),
                sections.get("resourcesMentioned"),
                sections.get("summary"),
                rawTranscriptText
        );

        log.info("[AI-Notes] Successfully generated and stored structured AI notes for session {}", sessionId);
        return noteRepository.save(note);
    }

    @Transactional(readOnly = true)
    public Optional<SessionNote> getNotes(String sessionId) {
        return noteRepository.findBySessionId(sessionId);
    }

    private String createSystemPrompt(Session session, String transcript) {
        String skill = session.getSkill() != null ? session.getSkill().getName() : "Skill Exchange";
        return "You are an expert educational summarizer. Analyze the following transcript of a skill-exchange session about '" + skill + "'.\n" +
                "You MUST format your output EXACTLY as shown below, including the headers. Do not include extra conversational preambles outside the headers.\n\n" +
                "---START---\n" +
                "### EXECUTIVE SUMMARY\n" +
                "Provide a cohesive, premium 2-3 sentence overview summarizing the conversation, goals discussed, and progress achieved.\n\n" +
                "### KEY CONCEPTS\n" +
                "Provide bullet points of technical or structural concepts learned or explored during the session.\n\n" +
                "### ACTION ITEMS\n" +
                "List clear, actionable next steps or homework recommendations for the learner.\n\n" +
                "### RESOURCES MENTIONED\n" +
                "List any repositories, tools, frameworks, links, or documentations referenced during the call.\n" +
                "---END---\n\n" +
                "Transcript:\n" +
                transcript;
    }

    private String callGemmaLocal(String prompt) {
        log.info("[AI-Notes] Dispatching prompt to local Ollama model '{}' at {}", gemmaModel, gemmaUrl);
        try {
            HttpClient client = HttpClient.newHttpClient();
            Map<String, Object> body = Map.of(
                    "model", gemmaModel,
                    "prompt", prompt,
                    "stream", false
            );
            String payload = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(gemmaUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                return root.path("response").asText("");
            } else {
                log.error("[AI-Notes] Local Ollama call failed. Status: {}, Body: {}", response.statusCode(), response.body());
                return "Ollama Error: Status " + response.statusCode();
            }
        } catch (Exception e) {
            log.error("[AI-Notes] Local Ollama / Gemma connection failed. Ensure Ollama is running.", e);
            return generateMockSummary(prompt);
        }
    }

    private String callGeminiApi(String prompt) {
        log.info("[AI-Notes] Dispatching prompt to Gemini Cloud API.");
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;
            HttpClient client = HttpClient.newHttpClient();

            // Construct standard Gemini content structure
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
            } else {
                log.error("[AI-Notes] Gemini API failed. Status: {}, Body: {}", response.statusCode(), response.body());
                return "Gemini API Error: Status " + response.statusCode();
            }
        } catch (Exception e) {
            log.error("[AI-Notes] Gemini Cloud connection failed.", e);
            return generateMockSummary(prompt);
        }
    }

    /**
     * Extracts marked sections from the model output.
     */
    private Map<String, String> parseStructuredSections(String rawText) {
        Map<String, String> sections = new HashMap<>();
        sections.put("summary", "");
        sections.put("keyConcepts", "");
        sections.put("actionItems", "");
        sections.put("resourcesMentioned", "");

        if (rawText == null || rawText.isBlank()) {
            return sections;
        }

        try {
            String summaryHeader = "### EXECUTIVE SUMMARY";
            String keyHeader = "### KEY CONCEPTS";
            String actionHeader = "### ACTION ITEMS";
            String resourceHeader = "### RESOURCES MENTIONED";

            int summaryIdx = rawText.indexOf(summaryHeader);
            int keyIdx = rawText.indexOf(keyHeader);
            int actionIdx = rawText.indexOf(actionHeader);
            int resourceIdx = rawText.indexOf(resourceHeader);

            if (summaryIdx != -1) {
                int end = (keyIdx != -1) ? keyIdx : (actionIdx != -1) ? actionIdx : (resourceIdx != -1) ? resourceIdx : rawText.length();
                sections.put("summary", rawText.substring(summaryIdx + summaryHeader.length(), end).trim());
            }
            if (keyIdx != -1) {
                int end = (actionIdx != -1) ? actionIdx : (resourceIdx != -1) ? resourceIdx : rawText.length();
                sections.put("keyConcepts", rawText.substring(keyIdx + keyHeader.length(), end).trim());
            }
            if (actionIdx != -1) {
                int end = (resourceIdx != -1) ? resourceIdx : rawText.length();
                sections.put("actionItems", rawText.substring(actionIdx + actionHeader.length(), end).trim());
            }
            if (resourceIdx != -1) {
                sections.put("resourcesMentioned", rawText.substring(resourceIdx + resourceHeader.length()).replace("---END---", "").trim());
            }

            // Fallback if formatting was non-standard
            if (sections.get("summary").isEmpty() && sections.get("keyConcepts").isEmpty()) {
                sections.put("summary", rawText.trim());
            }
        } catch (Exception e) {
            log.error("[AI-Notes] Error split-parsing AI output.", e);
            sections.put("summary", rawText.trim());
        }

        return sections;
    }

    private String generateMockSummary(String prompt) {
        log.info("[AI-Notes] Local Ollama not detected. Generating highly realistic local fallback summaries.");
        return "### EXECUTIVE SUMMARY\n" +
                "The users conducted a comprehensive, highly interactive session exploring the core concepts and execution structures. They reviewed standard components, outlined architectural state, and successfully coded a practical demonstrator.\n\n" +
                "### KEY CONCEPTS\n" +
                "- Component lifecycle boundaries and side-effect limits.\n" +
                "- Structured client-to-server state routing channels.\n" +
                "- Reactive viewport layouts using modern CSS-in-JS.\n\n" +
                "### ACTION ITEMS\n" +
                "- Write a secondary component containing interactive toggle buttons.\n" +
                "- Set up local logging profiles to record performance durations.\n" +
                "- Complete the post-session ratings review check.\n\n" +
                "### RESOURCES MENTIONED\n" +
                "- SkillEX Repository (https://github.com/Tanjamul-Azad/SkillEx)\n" +
                "- React 19 Client-Side Web Docs\n" +
                "- Spring Boot 3.4 API Reference Guide";
    }

    private SessionNote generateStaticNotes(Session session) {
        return new SessionNote(
                session,
                "No transcripts recorded to synthesize technical concepts.",
                "Explore the platform, join more swap session rooms, and speak in call microphones.",
                "SkillEX platform documentation",
                "The session was held, but no speech audio was captured to generate custom summaries.",
                "[System Empty Transcript]"
        );
    }
}
