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
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class NoteGenerationService {

    private static final int MAX_PROMPT_TRANSCRIPT_CHARS = 12_000;
    private static final double MIN_CONFIDENCE_FOR_STRICT_LINES = 0.45d;
    private static final int MAX_MERGED_UTTERANCE_CHARS = 420;
    private static final Duration MERGE_WINDOW = Duration.ofSeconds(45);
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");
    private static final Pattern FILLER_ONLY = Pattern.compile("^(um+|uh+|hmm+|ah+|ok+|okay+|so+|huh+)$", Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter DOC_DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final SessionNoteRepository noteRepository;
    private final SessionRepository sessionRepository;
    private final TranscriptService transcriptService;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.notes.provider:gemma}")
    private String aiProvider;

    @Value("${app.ai.gemma.url:http://localhost:11434/api/generate}")
    private String gemmaUrl;

    @Value("${app.ai.gemma.model:gemma2}")
    private String gemmaModel;

    @Value("${app.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Transactional
    public SessionNote generateAndSaveNotes(String sessionId) {
        log.info("[AI-Notes] Initiating note generation for session {} using provider: {}", sessionId, aiProvider);

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found with ID: " + sessionId));

        List<SessionTranscript> transcripts = transcriptService.getTranscripts(sessionId);
        PreparedTranscript prepared = prepareTranscriptForNotes(session, transcripts);

        if (prepared.rawTranscriptText().isBlank()) {
            log.warn("[AI-Notes] Transcript is empty for session {}. Generating static template notes.", sessionId);
            return saveOrUpdateNotes(
                    session,
                    "No transcripts recorded to synthesize technical concepts.",
                    "Explore the platform, join more swap session rooms, and speak in call microphones.",
                    "SkillEX platform documentation",
                    "The session was held, but no speech audio was captured to generate custom summaries.",
                    "[System Empty Transcript]"
            );
        }

        String prompt = createSystemPrompt(session, prepared);
        String aiResponse;

        if ("gemini".equalsIgnoreCase(aiProvider) && geminiApiKey != null && !geminiApiKey.isBlank()) {
            aiResponse = callGeminiApi(prompt);
        } else {
            aiResponse = callGemmaLocal(prompt, prepared);
        }

        Map<String, String> sections = parseStructuredSections(aiResponse);
        sections = ensureSectionQuality(sections, prepared);

        SessionNote note = saveOrUpdateNotes(
                session,
                sections.get("keyConcepts"),
                sections.get("actionItems"),
                sections.get("resourcesMentioned"),
                sections.get("summary"),
                prepared.rawTranscriptText()
        );

        log.info("[AI-Notes] Generated notes for session {} (raw lines={}, cleaned lines={}, removed noise={})",
                sessionId, prepared.rawLineCount(), prepared.cleanedLineCount(), prepared.removedLineCount());
        return note;
    }

    private SessionNote saveOrUpdateNotes(
            Session session,
            String keyConcepts,
            String actionItems,
            String resourcesMentioned,
            String summary,
            String rawTranscript
    ) {
        return noteRepository.findBySessionId(session.getId())
                .map(existing -> {
                    existing.replaceGeneratedContent(
                            keyConcepts,
                            actionItems,
                            resourcesMentioned,
                            summary,
                            rawTranscript
                    );
                    return noteRepository.save(existing);
                })
                .orElseGet(() -> noteRepository.save(new SessionNote(
                        session,
                        keyConcepts,
                        actionItems,
                        resourcesMentioned,
                        summary,
                        rawTranscript
                )));
    }

    @Transactional(readOnly = true)
    public Optional<SessionNote> getNotes(String sessionId) {
        return noteRepository.findBySessionId(sessionId);
    }

    @Transactional(readOnly = true)
    public String buildMarkdownDocument(Session session, SessionNote note) {
        String title = (session.getSkill() != null && session.getSkill().getName() != null)
                ? session.getSkill().getName()
                : "Skill Exchange";
        String teacher = session.getTeacher() != null ? session.getTeacher().getName() : "Teacher";
        String learner = session.getLearner() != null ? session.getLearner().getName() : "Learner";
        String generatedAt = note.getGeneratedAt() != null ? DOC_DATE_FMT.format(note.getGeneratedAt()) : DOC_DATE_FMT.format(LocalDateTime.now());

        StringBuilder doc = new StringBuilder();
        doc.append("# Session Notes Document\n\n");
        doc.append("## Meeting Snapshot\n");
        doc.append("- **Skill:** ").append(title).append("\n");
        doc.append("- **Session ID:** ").append(session.getId()).append("\n");
        doc.append("- **Participants:** ").append(teacher).append(" (Teacher), ").append(learner).append(" (Learner)\n");
        doc.append("- **Generated At:** ").append(generatedAt).append("\n\n");

        doc.append("## Executive Brief\n");
        doc.append(normalizeSectionText(note.getSummary())).append("\n\n");

        doc.append("## Key Insights, Decisions, and Questions\n");
        doc.append(asMarkdownBullets(note.getKeyConcepts())).append("\n\n");

        doc.append("## Action Plan\n");
        doc.append(asMarkdownBullets(note.getActionItems())).append("\n\n");

        doc.append("## References and Resources\n");
        String resources = normalizeSectionText(note.getResourcesMentioned());
        doc.append(resources.isBlank() ? "- None explicitly mentioned in transcript." : asMarkdownBullets(resources)).append("\n\n");

        doc.append("## Transcript Quality Note\n");
        doc.append("- Notes were generated from live speech transcription and cleaned for readability.\n");
        doc.append("- Very low-confidence/noisy utterances may have been excluded.\n");

        return doc.toString();
    }

    @Transactional(readOnly = true)
    public byte[] buildPdfDocument(Session session, SessionNote note) throws IOException {
        String markdown = buildMarkdownDocument(session, note);
        String[] lines = markdown.replace("\r", "").split("\n");

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDType1Font bodyFont = PDType1Font.HELVETICA;
            PDType1Font titleFont = PDType1Font.HELVETICA_BOLD;

            float margin = 48f;
            float y = page.getMediaBox().getHeight() - margin;
            float width = page.getMediaBox().getWidth() - margin * 2;

            PDPageContentStream stream = new PDPageContentStream(document, page);
            stream.beginText();
            stream.newLineAtOffset(margin, y);

            for (String rawLine : lines) {
                String line = rawLine == null ? "" : rawLine;
                boolean isHeader = line.startsWith("#");
                float fontSize = isHeader ? 13f : 10.5f;
                PDType1Font font = isHeader ? titleFont : bodyFont;
                float leading = isHeader ? 18f : 14f;

                String clean = line.replaceFirst("^#+\\s*", "");
                List<String> wrapped = wrapPdfLine(clean, font, fontSize, width);
                if (wrapped.isEmpty()) {
                    wrapped = List.of("");
                }

                for (String item : wrapped) {
                    if (y < margin + 30f) {
                        stream.endText();
                        stream.close();
                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);
                        stream = new PDPageContentStream(document, page);
                        y = page.getMediaBox().getHeight() - margin;
                        stream.beginText();
                        stream.newLineAtOffset(margin, y);
                    }
                    stream.setFont(font, fontSize);
                    stream.showText(item);
                    stream.newLineAtOffset(0, -leading);
                    y -= leading;
                }
            }

            stream.endText();
            stream.close();
            document.save(out);
            return out.toByteArray();
        }
    }

    private String createSystemPrompt(Session session, PreparedTranscript prepared) {
        String skill = session.getSkill() != null ? session.getSkill().getName() : "Skill Exchange";
        return """
                You are an expert meeting-note writer for skill-exchange sessions.
                Skill Topic: %s

                Input quality context:
                - Raw utterances: %d
                - Cleaned utterances: %d
                - Removed noisy/duplicate utterances: %d
                - Participant languages detected: %s

                Instructions:
                1) Use only evidence from transcript. If uncertain, write \"Unclear from transcript\".
                2) Convert messy speech-to-text into clean, structured, publication-grade notes.
                3) Use a NotebookLM/Claude-like style: crisp, well-grouped, no fluff, high signal.
                4) Extract real insights, decisions, and unresolved questions when present.
                5) Action items must be owner-oriented, testable, and specific.
                6) If no explicit resources were mentioned, return an empty list.

                Return ONLY valid JSON (no markdown fences, no extra keys) with this exact schema:
                {
                  "summary": "3-5 sentence executive brief with context + outcomes",
                  "keyConcepts": [
                    "[Insight] ...",
                    "[Decision] ...",
                    "[Open Question] ..."
                  ],
                  "actionItems": ["[Owner] action -> expected outcome", "..."],
                  "resourcesMentioned": ["resource/tool/link", "..."]
                }

                Transcript:
                %s
                """.formatted(
                skill,
                prepared.rawLineCount(),
                prepared.cleanedLineCount(),
                prepared.removedLineCount(),
                prepared.detectedLanguages(),
                prepared.optimizedTranscript()
        );
    }

    private String callGemmaLocal(String prompt, PreparedTranscript prepared) {
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
            }

            log.error("[AI-Notes] Local Ollama call failed. Status: {}, Body: {}", response.statusCode(), response.body());
            return "Ollama Error: Status " + response.statusCode();
        } catch (Exception e) {
            log.error("[AI-Notes] Local Ollama / Gemma connection failed. Ensure Ollama is running.", e);
            return generateExtractiveFallbackSummary(prepared);
        }
    }

    private String callGeminiApi(String prompt) {
        log.info("[AI-Notes] Dispatching prompt to Gemini Cloud API.");
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

            log.error("[AI-Notes] Gemini API failed. Status: {}, Body: {}", response.statusCode(), response.body());
            return "Gemini API Error: Status " + response.statusCode();
        } catch (Exception e) {
            log.error("[AI-Notes] Gemini Cloud connection failed.", e);
            return generateMockSummary();
        }
    }

    private Map<String, String> parseStructuredSections(String rawText) {
        Map<String, String> sections = new HashMap<>();
        sections.put("summary", "");
        sections.put("keyConcepts", "");
        sections.put("actionItems", "");
        sections.put("resourcesMentioned", "");

        if (rawText == null || rawText.isBlank()) {
            return sections;
        }

        Map<String, String> jsonSections = tryParseJsonSections(rawText);
        if (!jsonSections.isEmpty()) {
            return jsonSections;
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

            if (sections.get("summary").isEmpty() && sections.get("keyConcepts").isEmpty()) {
                sections.put("summary", rawText.trim());
            }
        } catch (Exception e) {
            log.error("[AI-Notes] Error split-parsing AI output.", e);
            sections.put("summary", rawText.trim());
        }

        return sections;
    }

    private Map<String, String> tryParseJsonSections(String rawText) {
        try {
            String body = rawText.trim();
            if (body.startsWith("```")) {
                body = body.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").trim();
            }
            JsonNode root = objectMapper.readTree(body);
            if (!root.isObject()) {
                return Map.of();
            }

            Map<String, String> parsed = new LinkedHashMap<>();
            parsed.put("summary", normalizeSectionText(root.path("summary").asText("")));
            parsed.put("keyConcepts", parseJsonListAsBullets(root.path("keyConcepts")));
            parsed.put("actionItems", parseJsonListAsBullets(root.path("actionItems")));
            parsed.put("resourcesMentioned", parseJsonListAsBullets(root.path("resourcesMentioned")));
            return parsed;
        } catch (Exception ignore) {
            return Map.of();
        }
    }

    private String parseJsonListAsBullets(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        if (node.isTextual()) {
            return normalizeSectionText(node.asText(""));
        }
        if (!node.isArray()) {
            return normalizeSectionText(node.toString());
        }

        List<String> items = new ArrayList<>();
        node.forEach(item -> {
            String line = normalizeSectionText(item.asText(""));
            if (!line.isBlank()) {
                items.add("- " + line);
            }
        });
        return String.join("\n", items);
    }

    private Map<String, String> ensureSectionQuality(Map<String, String> sections, PreparedTranscript prepared) {
        Map<String, String> safe = new HashMap<>(sections);

        String summary = normalizeSectionText(safe.getOrDefault("summary", ""));
        if (summary.length() < 40) {
            safe.put("summary", "Conversation covered practical discussion around session goals and next actions. " +
                    "Some speech segments were noisy; summary is based on the clearest captured parts.");
        } else {
            safe.put("summary", summary);
        }

        String keyConcepts = normalizeSectionText(safe.getOrDefault("keyConcepts", ""));
        if (keyConcepts.isBlank()) {
            keyConcepts = "- Unclear from transcript (speech quality limitations)\n" +
                    "- Main topic focused on " + (prepared.skillName().isBlank() ? "the session skill" : prepared.skillName());
        }
        safe.put("keyConcepts", keyConcepts);

        String actionItems = normalizeSectionText(safe.getOrDefault("actionItems", ""));
        if (actionItems.isBlank()) {
            actionItems = "- Teacher: clarify key steps with a short example in next session.\n" +
                    "- Learner: revise discussed points and prepare 2 follow-up questions.";
        }
        safe.put("actionItems", actionItems);

        safe.put("resourcesMentioned", normalizeSectionText(safe.getOrDefault("resourcesMentioned", "")));
        return safe;
    }

    private PreparedTranscript prepareTranscriptForNotes(Session session, List<SessionTranscript> transcripts) {
        if (transcripts == null || transcripts.isEmpty()) {
            return new PreparedTranscript("", "", 0, 0, 0, "unknown", skillName(session));
        }

        List<SessionTranscript> sorted = transcripts.stream()
                .sorted(Comparator.comparing(SessionTranscript::getSpokenAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        StringBuilder rawBuilder = new StringBuilder();
        List<PreparedLine> mergedLines = new ArrayList<>();
        int removed = 0;

        for (SessionTranscript transcript : sorted) {
            String speakerName = resolveSpeakerName(session, transcript);
            String cleaned = cleanTranscriptLine(transcript.getContent());
            LocalDateTime spokenAt = transcript.getSpokenAt();

            rawBuilder.append(speakerName)
                    .append(" [")
                    .append(transcript.getSpeakerRole())
                    .append("]: ")
                    .append(cleaned)
                    .append("\n");

            if (cleaned.isBlank() || isNoiseLine(cleaned, transcript.getConfidenceScore())) {
                removed++;
                continue;
            }

            if (!mergedLines.isEmpty()) {
                PreparedLine last = mergedLines.get(mergedLines.size() - 1);
                boolean sameSpeaker = last.speakerUserId().equals(transcript.getSpeakerUserId());
                boolean nearInTime = last.spokenAt() != null && spokenAt != null
                        && Duration.between(last.spokenAt(), spokenAt).abs().compareTo(MERGE_WINDOW) <= 0;
                boolean canMerge = last.content().length() + cleaned.length() + 1 <= MAX_MERGED_UTTERANCE_CHARS;
                boolean duplicateContinuation = normalizeForCompare(last.content()).equals(normalizeForCompare(cleaned));

                if (sameSpeaker && nearInTime && canMerge && !duplicateContinuation) {
                    mergedLines.set(mergedLines.size() - 1, last.merge(cleaned, spokenAt));
                    continue;
                }

                if (duplicateContinuation) {
                    removed++;
                    continue;
                }
            }

            mergedLines.add(new PreparedLine(
                    transcript.getSpeakerUserId(),
                    speakerName + " [" + transcript.getSpeakerRole() + "]",
                    cleaned,
                    spokenAt,
                    normalizeLanguageCode(transcript.getDetectedLanguage())
            ));
        }

        String optimizedTranscript = buildOptimizedTranscript(mergedLines);
        return new PreparedTranscript(
                rawBuilder.toString().trim(),
                optimizedTranscript,
                sorted.size(),
                mergedLines.size(),
                removed,
                joinLanguages(mergedLines),
                skillName(session)
        );
    }

    private String buildOptimizedTranscript(List<PreparedLine> mergedLines) {
        StringBuilder builder = new StringBuilder();
        for (PreparedLine line : mergedLines) {
            if (builder.length() >= MAX_PROMPT_TRANSCRIPT_CHARS) {
                break;
            }

            String timeBadge = formatTime(line.spokenAt());
            String languageBadge = line.languageCode() != null ? " {" + line.languageCode() + "}" : "";
            String rendered = timeBadge + " " + line.speakerLabel() + languageBadge + ": " + line.content() + "\n";

            if (builder.length() + rendered.length() > MAX_PROMPT_TRANSCRIPT_CHARS) {
                int remaining = Math.max(0, MAX_PROMPT_TRANSCRIPT_CHARS - builder.length() - 4);
                if (remaining > 0) {
                    builder.append(rendered, 0, Math.min(remaining, rendered.length())).append("...\n");
                }
                break;
            }
            builder.append(rendered);
        }
        return builder.toString().trim();
    }

    private String joinLanguages(List<PreparedLine> lines) {
        List<String> languages = lines.stream()
                .map(PreparedLine::languageCode)
                .filter(lang -> lang != null && !lang.isBlank())
                .distinct()
                .toList();
        if (languages.isEmpty()) {
            return "unknown";
        }
        return String.join(", ", languages);
    }

    private String skillName(Session session) {
        return session != null && session.getSkill() != null && session.getSkill().getName() != null
                ? session.getSkill().getName().trim()
                : "";
    }

    private String formatTime(LocalDateTime spokenAt) {
        if (spokenAt == null) {
            return "[--:--:--]";
        }
        return "[" + spokenAt.toLocalTime().withNano(0) + "]";
    }

    private String cleanTranscriptLine(String content) {
        if (content == null) {
            return "";
        }
        return MULTI_SPACE.matcher(content).replaceAll(" ").trim();
    }

    private boolean isNoiseLine(String content, BigDecimal confidence) {
        String normalized = content.trim();
        if (normalized.length() <= 1) {
            return true;
        }
        if (FILLER_ONLY.matcher(normalized).matches()) {
            return true;
        }
        return confidence != null
                && confidence.doubleValue() < MIN_CONFIDENCE_FOR_STRICT_LINES
                && normalized.length() < 8;
    }

    private String normalizeSectionText(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\r", "").trim();
    }

    private String asMarkdownBullets(String value) {
        String normalized = normalizeSectionText(value);
        if (normalized.isBlank()) {
            return "- Unclear from transcript.";
        }

        String[] lines = normalized.split("\n");
        List<String> bullets = new ArrayList<>();
        for (String line : lines) {
            String item = line.trim();
            if (item.isBlank()) {
                continue;
            }
            if (item.startsWith("- ")) {
                bullets.add(item);
            } else if (item.startsWith("* ")) {
                bullets.add("- " + item.substring(2).trim());
            } else {
                bullets.add("- " + item);
            }
        }
        if (bullets.isEmpty()) {
            return "- " + normalized;
        }
        return String.join("\n", bullets);
    }

    private List<String> wrapPdfLine(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        if (text == null || text.isBlank()) {
            return List.of("");
        }
        List<String> lines = new ArrayList<>();
        String[] words = text.split(" ");
        StringBuilder current = new StringBuilder();

        for (String word : words) {
            String candidate = current.isEmpty() ? word : current + " " + word;
            float candidateWidth = font.getStringWidth(candidate) / 1000f * fontSize;
            if (candidateWidth > maxWidth && !current.isEmpty()) {
                lines.add(current.toString());
                current.setLength(0);
                current.append(word);
            } else {
                current.setLength(0);
                current.append(candidate);
            }
        }
        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        return lines;
    }

    private String normalizeForCompare(String value) {
        return cleanTranscriptLine(value).toLowerCase(Locale.ROOT);
    }

    private String normalizeLanguageCode(String detectedLanguage) {
        if (detectedLanguage == null || detectedLanguage.isBlank()) {
            return null;
        }
        String code = detectedLanguage.trim().toLowerCase(Locale.ROOT);
        return code.length() > 16 ? code.substring(0, 16) : code;
    }

    private String generateMockSummary() {
        log.info("[AI-Notes] Returning generic structured fallback summary.");
        return toJsonFallback(
                "The session covered core concepts and practical discussion. Some segments were unclear due to speech quality.",
                List.of("Core topic walkthrough", "Practical examples discussed", "Q&A based clarification"),
                List.of(
                        "Learner: revise the discussed concepts and write a short recap",
                        "Teacher: prepare one focused follow-up exercise"
                ),
                List.of("Unclear from transcript")
        );
    }

    private String generateExtractiveFallbackSummary(PreparedTranscript prepared) {
        log.info("[AI-Notes] Local Ollama not detected. Returning transcript-based fallback summary.");
        List<String> transcriptPoints = extractTranscriptPoints(prepared.optimizedTranscript());
        if (transcriptPoints.isEmpty()) {
            return generateMockSummary();
        }

        String topic = prepared.skillName().isBlank() ? "the session topic" : prepared.skillName();
        List<String> keyConcepts = transcriptPoints.stream()
                .limit(5)
                .map(point -> "Transcript point: " + point)
                .toList();

        String summary = "The session focused on " + topic + " and included " + prepared.cleanedLineCount()
                + " usable transcript segment" + (prepared.cleanedLineCount() == 1 ? "" : "s") + ". "
                + "The clearest captured points were: " + String.join("; ", transcriptPoints.stream().limit(3).toList()) + ". "
                + "Some low-quality or duplicate speech was filtered before notes were prepared.";

        return toJsonFallback(
                summary,
                keyConcepts,
                List.of(
                        "Teacher: review the captured transcript points and clarify any unclear parts next session",
                        "Learner: write a short recap from the captured points and bring follow-up questions"
                ),
                List.of("No explicit external resources were captured in the transcript")
        );
    }

    private List<String> extractTranscriptPoints(String optimizedTranscript) {
        if (optimizedTranscript == null || optimizedTranscript.isBlank()) {
            return List.of();
        }

        return optimizedTranscript.lines()
                .map(line -> {
                    int delimiter = line.indexOf(": ");
                    return delimiter >= 0 ? line.substring(delimiter + 2) : line;
                })
                .map(this::cleanTranscriptLine)
                .filter(line -> line.length() >= 8)
                .filter(line -> !FILLER_ONLY.matcher(line).matches())
                .distinct()
                .limit(8)
                .toList();
    }

    private String toJsonFallback(String summary, List<String> keyConcepts, List<String> actionItems, List<String> resourcesMentioned) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "summary", summary,
                    "keyConcepts", keyConcepts,
                    "actionItems", actionItems,
                    "resourcesMentioned", resourcesMentioned
            ));
        } catch (Exception e) {
            return "{" +
                    "\"summary\":\"" + summary.replace("\"", "'") + "\"," +
                    "\"keyConcepts\":[\"Transcript reviewed\"]," +
                    "\"actionItems\":[\"Review generated notes\"]," +
                    "\"resourcesMentioned\":[]" +
                    "}";
        }
    }

    private String resolveSpeakerName(Session session, SessionTranscript transcript) {
        if (session.getTeacher() != null && transcript.getSpeakerUserId().equals(session.getTeacher().getId())) {
            return session.getTeacher().getName();
        }
        if (session.getLearner() != null && transcript.getSpeakerUserId().equals(session.getLearner().getId())) {
            return session.getLearner().getName();
        }
        return transcript.getSpeakerRole() == SessionTranscript.SpeakerRole.TEACHER ? "Teacher" : "Learner";
    }

    private record PreparedLine(
            String speakerUserId,
            String speakerLabel,
            String content,
            LocalDateTime spokenAt,
            String languageCode
    ) {
        private PreparedLine merge(String appendedText, LocalDateTime latestTime) {
            return new PreparedLine(
                    speakerUserId,
                    speakerLabel,
                    content + " " + appendedText,
                    latestTime != null ? latestTime : spokenAt,
                    languageCode
            );
        }
    }

    private record PreparedTranscript(
            String rawTranscriptText,
            String optimizedTranscript,
            int rawLineCount,
            int cleanedLineCount,
            int removedLineCount,
            String detectedLanguages,
            String skillName
    ) {}
}
