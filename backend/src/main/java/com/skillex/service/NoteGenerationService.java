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

    /** Overall ceiling on transcript size we keep for analysis (we chunk within this, so the whole meeting is covered). */
    private static final int MAX_PROMPT_TRANSCRIPT_CHARS = 48_000;
    /** Transcripts at/under this length are summarized in a single pass; longer ones use map-reduce. */
    private static final int SINGLE_PASS_THRESHOLD = 6_500;
    /** Target size of each map-step chunk (kept whole-line so speaker turns are never split mid-sentence). */
    private static final int CHUNK_TARGET_CHARS = 6_000;
    /** Safety cap on number of chunks so a pathologically long meeting can't spawn unbounded model calls. */
    private static final int MAX_CHUNKS = 10;
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
                    "No speech was captured during this session, so a detailed walkthrough could not be produced.",
                    "[System Empty Transcript]"
            );
        }

        String aiResponse;
        if ("gemini".equalsIgnoreCase(aiProvider) && geminiApiKey != null && !geminiApiKey.isBlank()) {
            // Gemini has a large context window — single rich pass over the full transcript.
            aiResponse = callGeminiApi(createSynthesisPrompt(session, prepared, "TRANSCRIPT", prepared.optimizedTranscript()));
        } else {
            aiResponse = generateWithGemma(session, prepared);
        }

        Map<String, String> sections = parseStructuredSections(aiResponse);
        sections = ensureSectionQuality(sections, prepared);

        SessionNote note = saveOrUpdateNotes(
                session,
                sections.get("keyConcepts"),
                sections.get("actionItems"),
                sections.get("resourcesMentioned"),
                sections.get("summary"),
                sections.get("detailedNotes"),
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
            String detailedNotes,
            String rawTranscript
    ) {
        return noteRepository.findBySessionId(session.getId())
                .map(existing -> {
                    existing.replaceGeneratedContent(
                            keyConcepts,
                            actionItems,
                            resourcesMentioned,
                            summary,
                            detailedNotes,
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
                        detailedNotes,
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
        doc.append("# ").append(title).append(" — Session Study Notes\n");
        doc.append("> Generated by SkillEX AI · ").append(generatedAt).append("\n\n");

        doc.append("## Session Snapshot\n");
        doc.append("- Skill: ").append(title).append("\n");
        doc.append("- Participants: ").append(teacher).append(" (Teacher), ").append(learner).append(" (Learner)\n");
        doc.append("- Session ID: ").append(session.getId()).append("\n");
        doc.append("- Generated: ").append(generatedAt).append("\n\n");

        doc.append("## Executive Summary\n");
        doc.append(normalizeSectionText(note.getSummary())).append("\n\n");

        doc.append("## Detailed Session Walkthrough\n");
        String detailed = normalizeSectionText(note.getDetailedNotes());
        doc.append(detailed.isBlank() ? "- Detailed walkthrough was not available for this session." : demoteHeadings(detailed)).append("\n\n");

        doc.append("## Key Concepts\n");
        doc.append(asMarkdownBullets(note.getKeyConcepts())).append("\n\n");

        doc.append("## Action Plan\n");
        doc.append(asMarkdownBullets(note.getActionItems())).append("\n\n");

        doc.append("## References & Resources\n");
        String resources = normalizeSectionText(note.getResourcesMentioned());
        doc.append(resources.isBlank() ? "- None explicitly mentioned in transcript." : asMarkdownBullets(resources)).append("\n\n");

        doc.append("## About These Notes\n");
        doc.append("- Generated from live speech transcription, cleaned for readability.\n");
        doc.append("- Very low-confidence or noisy utterances may have been excluded.\n");

        return doc.toString();
    }

    /** Demote a block's own headings one level so they nest cleanly under a parent section. */
    private String demoteHeadings(String block) {
        StringBuilder sb = new StringBuilder();
        for (String line : block.split("\n", -1)) {
            if (line.startsWith("## ")) {
                sb.append("### ").append(line.substring(3));
            } else if (line.startsWith("# ")) {
                sb.append("### ").append(line.substring(2));
            } else {
                sb.append(line);
            }
            sb.append("\n");
        }
        return sb.toString().trim();
    }

    @Transactional(readOnly = true)
    public byte[] buildPdfDocument(Session session, SessionNote note) throws IOException {
        String markdown = buildMarkdownDocument(session, note);
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfPainter painter = new PdfPainter(document);
            painter.begin();
            for (String line : markdown.replace("\r", "").split("\n", -1)) {
                painter.renderMarkdownLine(line == null ? "" : line);
            }
            painter.finish();
            document.save(out);
            return out.toByteArray();
        }
    }

    /**
     * Minimal markdown-to-PDF painter that produces a polished, shareable layout: a colored title rule,
     * sectioned headings with underline rules, hanging-indent bullets, and a page footer. Each text line
     * is drawn as its own text block so colors, indents and page breaks are easy to manage.
     */
    private static final class PdfPainter {
        private static final int[] BRAND = {79, 70, 229};
        private static final int[] TITLE = {17, 24, 39};
        private static final int[] BODY = {31, 41, 55};
        private static final int[] MUTED = {107, 114, 128};
        private static final int[] RULE = {209, 213, 219};

        private final PDDocument document;
        private final float margin = 50f;
        private float pageWidth;
        private float pageHeight;
        private float contentWidth;
        private float y;
        private int pageNumber = 0;
        private PDPage page;
        private PDPageContentStream cs;

        PdfPainter(PDDocument document) {
            this.document = document;
        }

        void begin() throws IOException {
            newPage();
        }

        void finish() throws IOException {
            if (cs != null) {
                drawFooter();
                cs.close();
                cs = null;
            }
        }

        private void newPage() throws IOException {
            if (cs != null) {
                drawFooter();
                cs.close();
            }
            page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            cs = new PDPageContentStream(document, page);
            pageWidth = page.getMediaBox().getWidth();
            pageHeight = page.getMediaBox().getHeight();
            contentWidth = pageWidth - margin * 2;
            y = pageHeight - margin;
            pageNumber++;
        }

        private void ensureSpace(float needed) throws IOException {
            if (y - needed < margin + 28f) {
                newPage();
            }
        }

        void renderMarkdownLine(String raw) throws IOException {
            String line = raw == null ? "" : raw;
            if (line.isBlank()) {
                y -= 5f;
                return;
            }
            if (line.startsWith("# ")) {
                renderTitle(line.substring(2));
            } else if (line.startsWith("## ")) {
                renderSectionHeading(line.substring(3));
            } else if (line.startsWith("### ")) {
                renderSubHeading(line.substring(4));
            } else if (line.startsWith("> ")) {
                renderBody(line.substring(2), MUTED, 9.5f);
            } else {
                String t = line.trim();
                if (t.startsWith("- ") || t.startsWith("* ")) {
                    renderBullet(t.substring(2));
                } else {
                    renderBody(line, BODY, 10.5f);
                }
            }
        }

        private void renderTitle(String text) throws IOException {
            ensureSpace(50f);
            for (String wl : wrap(text, PDType1Font.HELVETICA_BOLD, 21f, contentWidth)) {
                ensureSpace(26f);
                drawText(PDType1Font.HELVETICA_BOLD, 21f, BRAND, margin, wl);
                y -= 26f;
            }
            y -= 2f;
            drawRule(2f, BRAND);
            y -= 16f;
        }

        private void renderSectionHeading(String text) throws IOException {
            ensureSpace(34f);
            y -= 6f;
            for (String wl : wrap(text, PDType1Font.HELVETICA_BOLD, 13.5f, contentWidth)) {
                ensureSpace(18f);
                drawText(PDType1Font.HELVETICA_BOLD, 13.5f, BRAND, margin, wl);
                y -= 18f;
            }
            y -= 1f;
            drawRule(0.75f, RULE);
            y -= 10f;
        }

        private void renderSubHeading(String text) throws IOException {
            ensureSpace(22f);
            y -= 4f;
            for (String wl : wrap(text, PDType1Font.HELVETICA_BOLD, 11.5f, contentWidth)) {
                ensureSpace(16f);
                drawText(PDType1Font.HELVETICA_BOLD, 11.5f, TITLE, margin, wl);
                y -= 16f;
            }
            y -= 4f;
        }

        private void renderBody(String text, int[] color, float size) throws IOException {
            for (String wl : wrap(text, PDType1Font.HELVETICA, size, contentWidth)) {
                ensureSpace(14f);
                drawText(PDType1Font.HELVETICA, size, color, margin, wl);
                y -= 14f;
            }
        }

        private void renderBullet(String text) throws IOException {
            float textX = margin + 16f;
            float bulletWidth = contentWidth - 16f;
            List<String> wrapped = wrap(text, PDType1Font.HELVETICA, 10.5f, bulletWidth);
            boolean first = true;
            for (String wl : wrapped) {
                ensureSpace(14f);
                if (first) {
                    // small filled square marker, vertically aligned to the cap height of the line
                    cs.setNonStrokingColor(BRAND[0], BRAND[1], BRAND[2]);
                    cs.addRect(margin + 4f, y + 2f, 3.2f, 3.2f);
                    cs.fill();
                    first = false;
                }
                drawText(PDType1Font.HELVETICA, 10.5f, BODY, textX, wl);
                y -= 14f;
            }
        }

        private void drawText(PDType1Font font, float size, int[] color, float x, String text) throws IOException {
            cs.beginText();
            cs.setFont(font, size);
            cs.setNonStrokingColor(color[0], color[1], color[2]);
            cs.newLineAtOffset(x, y);
            cs.showText(sanitize(text));
            cs.endText();
        }

        private void drawRule(float thickness, int[] color) throws IOException {
            cs.setStrokingColor(color[0], color[1], color[2]);
            cs.setLineWidth(thickness);
            cs.moveTo(margin, y);
            cs.lineTo(margin + contentWidth, y);
            cs.stroke();
        }

        private void drawFooter() throws IOException {
            cs.beginText();
            cs.setFont(PDType1Font.HELVETICA, 8f);
            cs.setNonStrokingColor(MUTED[0], MUTED[1], MUTED[2]);
            cs.newLineAtOffset(margin, margin - 18f);
            cs.showText(sanitize("SkillEX · AI Session Notes"));
            cs.endText();

            String pageLabel = "Page " + pageNumber;
            float w = PDType1Font.HELVETICA.getStringWidth(pageLabel) / 1000f * 8f;
            cs.beginText();
            cs.setFont(PDType1Font.HELVETICA, 8f);
            cs.setNonStrokingColor(MUTED[0], MUTED[1], MUTED[2]);
            cs.newLineAtOffset(margin + contentWidth - w, margin - 18f);
            cs.showText(pageLabel);
            cs.endText();
        }

        private List<String> wrap(String text, PDType1Font font, float size, float maxWidth) throws IOException {
            String clean = sanitize(text);
            List<String> lines = new ArrayList<>();
            if (clean.isBlank()) {
                return lines;
            }
            StringBuilder current = new StringBuilder();
            for (String word : clean.split(" ")) {
                String candidate = current.length() == 0 ? word : current + " " + word;
                if (font.getStringWidth(candidate) / 1000f * size > maxWidth && current.length() > 0) {
                    lines.add(current.toString());
                    current.setLength(0);
                    current.append(word);
                } else {
                    current.setLength(0);
                    current.append(candidate);
                }
            }
            if (current.length() > 0) {
                lines.add(current.toString());
            }
            return lines;
        }

        /** Map common unicode punctuation to ASCII and drop anything the standard Helvetica font can't render. */
        private String sanitize(String text) {
            if (text == null) {
                return "";
            }
            String s = text
                    .replace("**", "")
                    .replace("‘", "'").replace("’", "'")
                    .replace("“", "\"").replace("”", "\"")
                    .replace("–", "-").replace("—", "-")
                    .replace("•", "-")
                    .replace("…", "...")
                    .replace("\t", "    ");
            StringBuilder sb = new StringBuilder(s.length());
            for (char c : s.toCharArray()) {
                if (c >= 32 && c <= 126) {
                    sb.append(c);
                } else if (c > 126) {
                    sb.append(' '); // non-Latin glyph (e.g. emoji, Bengali) — replace to keep layout safe
                }
            }
            return sb.toString();
        }
    }

    /**
     * Local-model path. Short transcripts are summarized in one pass; long ones are processed with a
     * map-reduce strategy: each chunk is summarized faithfully (the "map" step) so no part of a long
     * meeting is dropped, then all the per-part notes are synthesized into the final study guide (the
     * "reduce" step). This is what fixes "it only catches the upper part of long conversations".
     */
    private String generateWithGemma(Session session, PreparedTranscript prepared) {
        String transcript = prepared.optimizedTranscript();

        if (transcript.length() <= SINGLE_PASS_THRESHOLD) {
            log.info("[AI-Notes] Transcript fits in a single pass ({} chars).", transcript.length());
            return callGemmaForSynthesis(createSynthesisPrompt(session, prepared, "TRANSCRIPT", transcript), prepared);
        }

        List<String> chunks = splitTranscript(transcript);
        log.info("[AI-Notes] Long transcript ({} chars) -> map-reduce over {} chunks.", transcript.length(), chunks.size());

        StringBuilder partNotes = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            String chunk = chunks.get(i);
            String mapped = callGemmaRawOrEmpty(createChunkPrompt(session, i + 1, chunks.size(), chunk));
            String partBody = (mapped == null || mapped.isBlank())
                    ? extractiveChunkNotes(chunk)   // model unavailable/failed for this chunk — keep its content anyway
                    : mapped.trim();
            partNotes.append("=== PART ").append(i + 1).append(" OF ").append(chunks.size()).append(" ===\n")
                    .append(partBody).append("\n\n");
        }

        return callGemmaForSynthesis(
                createSynthesisPrompt(session, prepared, "SEQUENTIAL SECTION NOTES (in chronological order)", partNotes.toString().trim()),
                prepared
        );
    }

    /**
     * Splits the optimized transcript into chunks on line boundaries so a speaker turn is never cut
     * in half. Capped at {@link #MAX_CHUNKS} to bound model calls for very long meetings.
     */
    private List<String> splitTranscript(String transcript) {
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : transcript.split("\n")) {
            boolean roomForMoreChunks = chunks.size() < MAX_CHUNKS - 1;
            if (roomForMoreChunks && current.length() + line.length() + 1 > CHUNK_TARGET_CHARS && current.length() > 0) {
                // Once we've opened MAX_CHUNKS-1 chunks, everything remaining folds into the final one
                // rather than being split further or dropped — the whole tail is still covered.
                chunks.add(current.toString().trim());
                current.setLength(0);
            }
            current.append(line).append("\n");
        }
        if (current.length() > 0) {
            chunks.add(current.toString().trim());
        }
        return chunks;
    }

    private String createChunkPrompt(Session session, int part, int total, String chunk) {
        String skill = session.getSkill() != null ? session.getSkill().getName() : "Skill Exchange";
        return """
                You are taking careful, detailed notes during ONE part of a live skill-exchange session.
                Skill topic: %s
                This is PART %d of %d (chronological). Only cover what happens in THIS excerpt.

                Write a faithful, detailed account of this part as study notes:
                - Attribute statements to the speaker by name (e.g. "Maria explained...", "the learner asked...").
                - Capture EVERY distinct topic, question, explanation, example, definition and decision. Do not skip any topic just because it appears later in the excerpt.
                - Stay strictly faithful to the transcript. Do NOT invent facts. If something is unclear, say "unclear from audio".
                - Output: one short paragraph of prose, then a bullet list ("- ") of the concrete points covered in order.
                Do NOT write a conclusion or summary for the whole session — this is only one part.

                Transcript excerpt:
                %s
                """.formatted(skill, part, total, chunk);
    }

    private String createSynthesisPrompt(Session session, PreparedTranscript prepared, String sourceLabel, String sourceText) {
        String skill = session.getSkill() != null ? session.getSkill().getName() : "Skill Exchange";
        return """
                You are an expert note-writer producing a polished, shareable study guide for a skill-exchange session.
                Skill topic: %s

                Input quality context:
                - Raw utterances: %d
                - Cleaned utterances: %d
                - Removed noisy/duplicate utterances: %d
                - Participant languages detected: %s

                Instructions:
                1) Use ONLY evidence from the source below. If uncertain, write "Unclear from transcript" — never invent.
                2) Cover the WHOLE session from start to finish, not just the opening. Weight your notes by where the conversation actually spent the most time.
                3) Refer to participants by their names as they appear in the source.
                4) Write like clean, publication-grade bookish notes: organized, descriptive, accurate, high signal, no fluff.

                Return ONLY valid JSON (no markdown fences, no extra keys, no trailing commas).
                CRITICAL: escape newlines inside strings as \\n and do not use raw unescaped double quotes inside string values (use single quotes instead).

                JSON schema (field order matters):
                {
                  "summary": "4-6 sentence executive brief: context, what was covered, and outcomes",
                  "detailedNotes": "The MAIN artifact. A long, descriptive, chronological walkthrough of the whole session written as polished study notes. Use '## ' for section headings and '- ' for bullets. Name who said what, capture explanations, examples given, questions asked and how they were answered, and decisions made. Be thorough and accurate across the ENTIRE session. Use \\n for line breaks.",
                  "keyConcepts": ["[Concept] short explanation of the idea and why it matters", "..."],
                  "actionItems": ["[Owner] specific next action -> expected outcome", "..."],
                  "resourcesMentioned": ["tool / link / book / resource actually mentioned", "..."]
                }
                If no resources were mentioned, return an empty array for resourcesMentioned.

                %s:
                %s
                """.formatted(
                skill,
                prepared.rawLineCount(),
                prepared.cleanedLineCount(),
                prepared.removedLineCount(),
                prepared.detectedLanguages(),
                sourceLabel,
                sourceText
        );
    }

    /** Final synthesis call: on any failure, degrade to a transcript-derived fallback so the user always gets notes. */
    private String callGemmaForSynthesis(String prompt, PreparedTranscript prepared) {
        String raw = callGemmaRawOrEmpty(prompt);
        if (raw == null || raw.isBlank()) {
            log.warn("[AI-Notes] Local model returned no synthesis output; using transcript-based fallback.");
            return generateExtractiveFallbackSummary(prepared);
        }
        return raw;
    }

    /** Single Ollama generate call. Returns the model text, or empty string on any error (caller decides fallback). */
    private String callGemmaRawOrEmpty(String prompt) {
        log.info("[AI-Notes] Dispatching prompt to local Ollama model '{}' at {} ({} chars).", gemmaModel, gemmaUrl, prompt.length());
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            Map<String, Object> options = Map.of(
                    "temperature", 0.3,
                    "num_ctx", 8192,
                    "num_predict", 3072
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

            log.error("[AI-Notes] Local Ollama call failed. Status: {}, Body: {}", response.statusCode(), response.body());
            return "";
        } catch (Exception e) {
            log.error("[AI-Notes] Local Ollama / Gemma connection failed. Ensure Ollama is running.", e);
            return "";
        }
    }

    /** Minimal faithful notes for a chunk when the model is unavailable, so its content is never lost. */
    private String extractiveChunkNotes(String chunk) {
        List<String> points = extractTranscriptPoints(chunk);
        if (points.isEmpty()) {
            return chunk;
        }
        StringBuilder sb = new StringBuilder("Captured points from this part of the conversation:\n");
        points.forEach(p -> sb.append("- ").append(p).append("\n"));
        return sb.toString().trim();
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
        sections.put("detailedNotes", "");
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
        if (rawText == null || rawText.isBlank()) {
            return Map.of();
        }
        try {
            String body = rawText.trim();
            // Robustly extract the JSON substring between the first '{' and the last '}'
            int firstBrace = body.indexOf('{');
            int lastBrace = body.lastIndexOf('}');
            if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
                body = body.substring(firstBrace, lastBrace + 1);
            }

            if (body.startsWith("```")) {
                body = body.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "").trim();
            }

            try {
                JsonNode root = objectMapper.readTree(body);
                if (root.isObject()) {
                    Map<String, String> parsed = new LinkedHashMap<>();
                    parsed.put("summary", normalizeSectionText(root.path("summary").asText("")));
                    parsed.put("detailedNotes", normalizeSectionText(root.path("detailedNotes").asText("")));
                    parsed.put("keyConcepts", parseJsonListAsBullets(root.path("keyConcepts")));
                    parsed.put("actionItems", parseJsonListAsBullets(root.path("actionItems")));
                    parsed.put("resourcesMentioned", parseJsonListAsBullets(root.path("resourcesMentioned")));
                    return parsed;
                }
            } catch (Exception parseException) {
                log.warn("[AI-Notes] Standard JSON parsing failed. Attempting robust regex extraction fallback.", parseException);
                return parseJsonUsingRegex(body);
            }
        } catch (Exception ignore) {
        }
        return Map.of();
    }

    private Map<String, String> parseJsonUsingRegex(String json) {
        Map<String, String> parsed = new LinkedHashMap<>();
        parsed.put("summary", "");
        parsed.put("detailedNotes", "");
        parsed.put("keyConcepts", "");
        parsed.put("actionItems", "");
        parsed.put("resourcesMentioned", "");

        try {
            String summaryVal = extractFieldContent(json, "summary", "detailedNotes");
            parsed.put("summary", cleanRegexExtractedValue(summaryVal));

            String detailedVal = extractFieldContent(json, "detailedNotes", "keyConcepts");
            parsed.put("detailedNotes", cleanRegexExtractedValue(detailedVal));

            String keyConceptsVal = extractFieldContent(json, "keyConcepts", "actionItems");
            parsed.put("keyConcepts", cleanRegexExtractedList(keyConceptsVal));

            String actionItemsVal = extractFieldContent(json, "actionItems", "resourcesMentioned");
            parsed.put("actionItems", cleanRegexExtractedList(actionItemsVal));

            String resourcesVal = extractFieldContent(json, "resourcesMentioned", null);
            parsed.put("resourcesMentioned", cleanRegexExtractedList(resourcesVal));
        } catch (Exception e) {
            log.error("[AI-Notes] Regex JSON extractor fallback failed.", e);
        }
        return parsed;
    }

    private String extractFieldContent(String json, String currentKey, String nextKey) {
        String startMarker = "\"" + currentKey + "\"";
        int startIdx = json.indexOf(startMarker);
        if (startIdx == -1) {
            return "";
        }
        int valueStart = json.indexOf(":", startIdx + startMarker.length());
        if (valueStart == -1) {
            return "";
        }
        valueStart += 1; // skip ':'

        int endIdx;
        if (nextKey != null) {
            String endMarker = "\"" + nextKey + "\"";
            endIdx = json.indexOf(endMarker, valueStart);
        } else {
            endIdx = json.lastIndexOf("}");
        }

        if (endIdx == -1 || endIdx <= valueStart) {
            return json.substring(valueStart).trim();
        }

        return json.substring(valueStart, endIdx).trim();
    }

    private String cleanRegexExtractedValue(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String val = raw.trim();
        if (val.startsWith("\"")) {
            val = val.substring(1);
        }
        val = val.replaceAll(",\\s*$", "").trim();
        if (val.endsWith("\"")) {
            val = val.substring(0, val.length() - 1);
        }
        return val.replace("\\n", "\n")
                .replace("\\t", "    ")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\")
                .trim();
    }

    private String cleanRegexExtractedList(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String val = raw.trim();
        val = val.replaceAll(",\\s*$", "").trim();
        if (val.startsWith("[")) {
            val = val.substring(1);
        }
        if (val.endsWith("]")) {
            val = val.substring(0, val.length() - 1);
        }
        val = val.trim();

        String[] lines = val.split("\",\\s*\"|\",?\\s*\\n\\s*\"");
        List<String> items = new ArrayList<>();
        for (String line : lines) {
            String clean = line.trim();
            if (clean.startsWith("\"")) {
                clean = clean.substring(1);
            }
            if (clean.endsWith("\"")) {
                clean = clean.substring(0, clean.length() - 1);
            }
            clean = clean.replace("\\\"", "\"").trim();
            if (!clean.isBlank()) {
                items.add("- " + clean);
            }
        }
        return String.join("\n", items);
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

        String detailedNotes = normalizeSectionText(safe.getOrDefault("detailedNotes", ""));
        if (detailedNotes.length() < 80) {
            // Build a readable walkthrough from the clearest captured lines so the section is never empty.
            List<String> points = extractTranscriptPoints(prepared.optimizedTranscript());
            StringBuilder fallback = new StringBuilder();
            fallback.append("This walkthrough is reconstructed from the clearest captured speech, as the AI model could not")
                    .append(" produce a full narrative (the audio was noisy or the local model was unavailable).\n\n")
                    .append("## What was discussed\n");
            if (points.isEmpty()) {
                fallback.append("- The session was held but little usable speech was captured.");
            } else {
                points.forEach(p -> fallback.append("- ").append(p).append("\n"));
            }
            detailedNotes = fallback.toString().trim();
        }
        safe.put("detailedNotes", detailedNotes);

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
                "",
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

        StringBuilder detailed = new StringBuilder();
        detailed.append("This walkthrough was reconstructed from the clearest captured speech because the AI model was ")
                .append("unavailable. It lists the points that came through most reliably, in order.\n\n")
                .append("## Captured discussion points\n");
        transcriptPoints.forEach(p -> detailed.append("- ").append(p).append("\n"));

        return toJsonFallback(
                summary,
                detailed.toString().trim(),
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

    private String toJsonFallback(String summary, String detailedNotes, List<String> keyConcepts, List<String> actionItems, List<String> resourcesMentioned) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("summary", summary);
            payload.put("detailedNotes", detailedNotes);
            payload.put("keyConcepts", keyConcepts);
            payload.put("actionItems", actionItems);
            payload.put("resourcesMentioned", resourcesMentioned);
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return "{" +
                    "\"summary\":\"" + summary.replace("\"", "'") + "\"," +
                    "\"detailedNotes\":\"\"," +
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
