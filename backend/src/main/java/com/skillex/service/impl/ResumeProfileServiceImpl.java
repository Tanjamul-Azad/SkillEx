package com.skillex.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.user.AddSkillRequest;
import com.skillex.dto.user.ApplyResumeProfileRequest;
import com.skillex.dto.user.ResumeProfileDto;
import com.skillex.dto.user.UserProfileDto;
import com.skillex.model.ResumeProfile;
import com.skillex.model.User;
import com.skillex.repository.ResumeProfileRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.NoteGenerationService;
import com.skillex.service.ResumeProfileService;
import com.skillex.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeProfileServiceImpl implements ResumeProfileService {
    private static final long MAX_RESUME_UPLOAD_BYTES = 10L * 1024L * 1024L;
    private static final int MAX_MODEL_TEXT_CHARS = 18_000;
    private static final Pattern MULTI_SPACE = Pattern.compile("[ \\t\\x0B\\f\\r]+");
    private static final Set<String> PDF_CONTENT_TYPES = Set.of("application/pdf", "application/x-pdf");
    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final TypeReference<List<ResumeProfileDto.SkillSuggestion>> SKILL_LIST_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<ResumeProfileDto.ProfileSignal>> SIGNAL_LIST_TYPE = new TypeReference<>() {};

    private final UserRepository userRepository;
    private final ResumeProfileRepository resumeProfileRepository;
    private final NoteGenerationService noteGenerationService;
    private final UserService userService;
    private final DtoMapper mapper;
    private final ObjectMapper objectMapper;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.ocr.enabled:false}")
    private boolean ocrEnabled;

    @Value("${app.ocr.tesseract.command:tesseract}")
    private String tesseractCommand;

    @Override
    @Transactional
    public ResumeProfileDto analyze(String userId, MultipartFile file) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        validateResumeFile(file);

        try {
            StoredResume stored = saveResumeFile(file);
            ExtractedText extracted = extractText(stored.path(), stored.contentType());
            ParsedResumeProfile parsed = parseResume(user, extracted.text());

            ResumeProfile profile = resumeProfileRepository.findByUserId(userId)
                .orElseGet(() -> ResumeProfile.builder()
                    .user(user)
                    .createdAt(LocalDateTime.now())
                    .build());

            profile.setResumeUrl(stored.url());
            profile.setSourceFilename(clip(file.getOriginalFilename(), 255));
            profile.setContentType(stored.contentType());
            profile.setExtractionMethod(extracted.method());
            profile.setStatus(extracted.text().length() < 250 ? "NEEDS_REVIEW" : "READY");
            profile.setRawText(clip(extracted.text(), 240_000));
            applyParsed(profile, parsed);

            user.setResumeUrl(stored.url());
            userRepository.save(user);

            return toDto(resumeProfileRepository.save(profile));
        } catch (IOException e) {
            throw new IllegalStateException("Could not process resume file.", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ResumeProfileDto getLatest(String userId) {
        return resumeProfileRepository.findByUserId(userId)
            .map(this::toDto)
            .orElse(null);
    }

    @Override
    @Transactional
    public UserProfileDto apply(String userId, ApplyResumeProfileRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        ResumeProfile profile = resumeProfileRepository.findByUserId(userId)
            .orElseThrow(() -> new EntityNotFoundException("No analyzed resume profile found."));

        if (Boolean.TRUE.equals(request.applyBio())) {
            user.setBio(buildBio(profile));
        }
        if (Boolean.TRUE.equals(request.applyTeachIntent())) {
            user.setTeachIntentText(cleanForProfile(profile.getTeachSummary(), 500));
        }
        if (Boolean.TRUE.equals(request.applyLearnIntent())) {
            user.setLearnIntentText(cleanForProfile(profile.getLearnSummary(), 500));
        }
        if (profile.getResumeUrl() != null && !profile.getResumeUrl().isBlank()) {
            user.setResumeUrl(profile.getResumeUrl());
        }
        userRepository.save(user);

        applySkills(userId, request.offeredSkills(), "offered");
        applySkills(userId, request.wantedSkills(), "wanted");

        return mapper.toProfile(userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId)));
    }

    private void applySkills(String userId, List<ApplyResumeProfileRequest.SelectedResumeSkill> skills, String type) {
        if (skills == null || skills.isEmpty()) {
            return;
        }

        skills.stream()
            .filter(skill -> skill != null && skill.name() != null && !skill.name().isBlank())
            .limit(12)
            .forEach(skill -> {
                String level = normalizeLevel(skill.level());
                try {
                    userService.addSkill(userId, new AddSkillRequest(
                        null,
                        clip(skill.name().trim(), 100),
                        cleanCategory(skill.category()),
                        cleanForProfile(skill.evidence(), 500),
                        "Resume/CV profile scan",
                        85,
                        true,
                        level,
                        type,
                        null,
                        type.equals("offered") ? cleanForProfile(skill.evidence(), 500) : null
                    ));
                } catch (RuntimeException e) {
                    log.warn("Resume skill apply skipped: user={}, skill={}, type={}", userId, skill.name(), type, e);
                }
            });
    }

    private void validateResumeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a resume or CV file.");
        }
        if (file.getSize() > MAX_RESUME_UPLOAD_BYTES) {
            throw new IllegalArgumentException("Resume file must be 10MB or smaller.");
        }

        String contentType = normalizeContentType(file.getContentType(), file.getOriginalFilename());
        if (!PDF_CONTENT_TYPES.contains(contentType) && !IMAGE_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Upload a PDF, PNG, JPG, or WebP resume.");
        }
    }

    private StoredResume saveResumeFile(MultipartFile file) throws IOException {
        String contentType = normalizeContentType(file.getContentType(), file.getOriginalFilename());
        validateSignature(file, contentType);

        Path uploadPath = Paths.get(uploadDir, "resumes");
        Files.createDirectories(uploadPath);

        String extension = extensionFor(contentType);
        String filename = UUID.randomUUID() + extension;
        Path path = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);
        return new StoredResume(path, "/uploads/resumes/" + filename, contentType);
    }

    private void validateSignature(MultipartFile file, String contentType) throws IOException {
        byte[] header;
        try (var stream = file.getInputStream()) {
            header = stream.readNBytes(16);
        }

        if (PDF_CONTENT_TYPES.contains(contentType)) {
            boolean pdf = header.length >= 5
                && header[0] == '%'
                && header[1] == 'P'
                && header[2] == 'D'
                && header[3] == 'F'
                && header[4] == '-';
            if (!pdf) {
                throw new IllegalArgumentException("Uploaded resume is not a valid PDF.");
            }
            return;
        }

        boolean image = switch (contentType) {
            case "image/jpeg" -> header.length >= 3
                && (header[0] & 0xFF) == 0xFF
                && (header[1] & 0xFF) == 0xD8
                && (header[2] & 0xFF) == 0xFF;
            case "image/png" -> startsWith(header, new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
            case "image/webp" -> header.length >= 12
                && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            default -> false;
        };
        if (!image) {
            throw new IllegalArgumentException("Uploaded file content does not match a supported resume format.");
        }
    }

    private ExtractedText extractText(Path path, String contentType) throws IOException {
        if (PDF_CONTENT_TYPES.contains(contentType)) {
            try (PDDocument document = PDDocument.load(path.toFile())) {
                PDFTextStripper stripper = new PDFTextStripper();
                String pdfText = normalizeExtractedText(stripper.getText(document));
                if (pdfText.length() >= 250 || !ocrEnabled) {
                    return new ExtractedText(pdfText, "PDF_TEXT");
                }
                String ocrText = ocrPdf(document);
                if (!ocrText.isBlank()) {
                    return new ExtractedText(normalizeExtractedText(pdfText + "\n" + ocrText), "OCR_TESSERACT");
                }
                return new ExtractedText(pdfText, "PDF_TEXT");
            }
        }

        if (!ocrEnabled) {
            return new ExtractedText("", "OCR_DISABLED");
        }
        return new ExtractedText(normalizeExtractedText(runTesseract(path)), "OCR_TESSERACT");
    }

    private String ocrPdf(PDDocument document) {
        StringBuilder builder = new StringBuilder();
        PDFRenderer renderer = new PDFRenderer(document);
        int pages = Math.min(document.getNumberOfPages(), 4);

        for (int i = 0; i < pages; i++) {
            Path temp = null;
            try {
                BufferedImage image = renderer.renderImageWithDPI(i, 200, ImageType.RGB);
                temp = Files.createTempFile("skillex-resume-ocr-" + i, ".png");
                ImageIO.write(image, "png", temp.toFile());
                builder.append(runTesseract(temp)).append("\n");
            } catch (Exception e) {
                log.warn("OCR failed for resume page {}", i + 1, e);
            } finally {
                if (temp != null) {
                    try {
                        Files.deleteIfExists(temp);
                    } catch (IOException ignored) {
                        // Temporary OCR image cleanup failure is non-critical.
                    }
                }
            }
        }
        return builder.toString();
    }

    private String runTesseract(Path imagePath) {
        try {
            Process process = new ProcessBuilder(tesseractCommand, imagePath.toString(), "stdout", "-l", "eng")
                .redirectErrorStream(true)
                .start();
            boolean finished = process.waitFor(45, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return "";
            }
            return new String(process.getInputStream().readAllBytes());
        } catch (Exception e) {
            log.warn("Tesseract OCR is not available or failed.", e);
            return "";
        }
    }

    private ParsedResumeProfile parseResume(User user, String rawText) {
        String text = clip(rawText == null ? "" : rawText, MAX_MODEL_TEXT_CHARS);
        if (text.isBlank()) {
            return fallbackParsedProfile(user, rawText);
        }

        String prompt = """
            You are SkillEX's resume intelligence parser.

            Task:
            Convert the user's resume/CV text into structured SkillEX profile data. This data will personalize:
            - profile bio and learning/teaching intent
            - skill-gap plans
            - mentor/session recommendations
            - certificates and XP suggestions

            Rules:
            - Return ONLY valid JSON. No markdown fences.
            - Use evidence from the resume. Do not invent employers, degrees, certificates, tools, or skills.
            - suggestedOfferedSkills means skills the user can credibly teach or mentor.
            - suggestedWantedSkills means next skills the user should learn based on career goal, gaps, and prerequisites.
            - Keep skill names concise and searchable.
            - level must be BEGINNER, MODERATE, or EXPERT.
            - confidence is 0-100.

            JSON schema:
            {
              "headline": "one-line professional identity",
              "educationSummary": "short evidence-based summary",
              "experienceSummary": "short evidence-based summary",
              "projectSummary": "short evidence-based summary",
              "certificationSummary": "short evidence-based summary",
              "toolsSummary": "tools, frameworks, platforms mentioned",
              "languageSummary": "languages or communication strengths mentioned",
              "careerGoal": "inferred target direction or empty string",
              "teachSummary": "what this user can teach on SkillEX",
              "learnSummary": "what this user should learn next on SkillEX",
              "suggestedOfferedSkills": [
                {"name":"Python","category":"Tech","level":"MODERATE","evidence":"Used in projects...","confidence":86}
              ],
              "suggestedWantedSkills": [
                {"name":"Django REST APIs","category":"Tech","level":"BEGINNER","evidence":"Next step after Python...","confidence":78}
              ],
              "profileSignals": [
                {"label":"Backend project","value":"Built a Flask CRUD app"}
              ],
              "confidence": 80
            }

            User profile:
            Name: %s
            University: %s
            Current teach intent: %s
            Current learn intent: %s

            Resume text:
            %s
            """.formatted(
            nullToEmpty(user.getName()),
            nullToEmpty(user.getUniversity()),
            nullToEmpty(user.getTeachIntentText()),
            nullToEmpty(user.getLearnIntentText()),
            text
        );

        String response = noteGenerationService.generateWithOllama(prompt);
        try {
            JsonNode root = objectMapper.readTree(extractJsonObject(response));
            return parsedFromJson(root, user, rawText);
        } catch (Exception e) {
            log.warn("AI resume parser returned invalid JSON; using local fallback.", e);
            return fallbackParsedProfile(user, rawText);
        }
    }

    private ParsedResumeProfile parsedFromJson(JsonNode root, User user, String rawText) {
        List<ResumeProfileDto.SkillSuggestion> offered = parseSkillSuggestions(root.path("suggestedOfferedSkills"));
        List<ResumeProfileDto.SkillSuggestion> wanted = parseSkillSuggestions(root.path("suggestedWantedSkills"));
        List<ResumeProfileDto.ProfileSignal> signals = parseSignals(root.path("profileSignals"));

        if (offered.isEmpty() && wanted.isEmpty()) {
            ParsedResumeProfile fallback = fallbackParsedProfile(user, rawText);
            offered = fallback.suggestedOfferedSkills();
            wanted = fallback.suggestedWantedSkills();
            signals = fallback.profileSignals();
        }

        return new ParsedResumeProfile(
            firstNonBlank(root.path("headline").asText(""), fallbackHeadline(user, rawText)),
            root.path("educationSummary").asText(""),
            root.path("experienceSummary").asText(""),
            root.path("projectSummary").asText(""),
            root.path("certificationSummary").asText(""),
            root.path("toolsSummary").asText(""),
            root.path("languageSummary").asText(""),
            root.path("careerGoal").asText(""),
            root.path("teachSummary").asText(""),
            root.path("learnSummary").asText(""),
            offered,
            wanted,
            signals,
            clamp(root.path("confidence").asInt(70), 0, 100)
        );
    }

    private List<ResumeProfileDto.SkillSuggestion> parseSkillSuggestions(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<ResumeProfileDto.SkillSuggestion> suggestions = new ArrayList<>();
        for (JsonNode item : node) {
            String name = item.path("name").asText("").trim();
            if (name.isBlank()) {
                continue;
            }
            suggestions.add(new ResumeProfileDto.SkillSuggestion(
                clip(name, 100),
                cleanCategory(item.path("category").asText("Other")),
                normalizeLevel(item.path("level").asText("BEGINNER")),
                cleanForProfile(item.path("evidence").asText(""), 500),
                clamp(item.path("confidence").asInt(70), 0, 100)
            ));
        }
        return suggestions.stream().limit(12).toList();
    }

    private List<ResumeProfileDto.ProfileSignal> parseSignals(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<ResumeProfileDto.ProfileSignal> signals = new ArrayList<>();
        for (JsonNode item : node) {
            String label = item.path("label").asText("").trim();
            String value = item.path("value").asText("").trim();
            if (!label.isBlank() && !value.isBlank()) {
                signals.add(new ResumeProfileDto.ProfileSignal(clip(label, 80), cleanForProfile(value, 300)));
            }
        }
        return signals.stream().limit(10).toList();
    }

    private ParsedResumeProfile fallbackParsedProfile(User user, String rawText) {
        String text = normalizeExtractedText(rawText == null ? "" : rawText);
        String lower = text.toLowerCase(Locale.ROOT);
        List<ResumeProfileDto.SkillSuggestion> offered = new ArrayList<>();

        addKeywordSkill(offered, lower, "Python", "Tech", "MODERATE", "Resume mentions Python.");
        addKeywordSkill(offered, lower, "Java", "Tech", "MODERATE", "Resume mentions Java.");
        addKeywordSkill(offered, lower, "React", "Tech", "MODERATE", "Resume mentions React.");
        addKeywordSkill(offered, lower, "Spring Boot", "Tech", "MODERATE", "Resume mentions Spring Boot.");
        addKeywordSkill(offered, lower, "SQL", "Tech", "MODERATE", "Resume mentions SQL or database work.");
        addKeywordSkill(offered, lower, "Machine Learning", "Tech", "BEGINNER", "Resume mentions machine learning.");
        addKeywordSkill(offered, lower, "Figma", "Creative", "MODERATE", "Resume mentions Figma.");
        addKeywordSkill(offered, lower, "Public Speaking", "General", "MODERATE", "Resume mentions presentations, speaking, or leadership.");

        List<ResumeProfileDto.SkillSuggestion> wanted = new ArrayList<>();
        if (lower.contains("react") || lower.contains("javascript")) {
            wanted.add(new ResumeProfileDto.SkillSuggestion(
                "Production Frontend Architecture",
                "Tech",
                "BEGINNER",
                "Next step after frontend project experience.",
                68
            ));
        }
        if (lower.contains("python") || lower.contains("django") || lower.contains("flask")) {
            wanted.add(new ResumeProfileDto.SkillSuggestion(
                "API Design and Testing",
                "Tech",
                "BEGINNER",
                "Useful next step for Python web development.",
                70
            ));
        }
        if (wanted.isEmpty()) {
            wanted.add(new ResumeProfileDto.SkillSuggestion(
                "Portfolio Project Planning",
                "General",
                "BEGINNER",
                "A practical next step after importing profile evidence.",
                60
            ));
        }

        List<ResumeProfileDto.ProfileSignal> signals = extractFallbackSignals(text);
        return new ParsedResumeProfile(
            fallbackHeadline(user, text),
            sectionGuess(text, "education"),
            sectionGuess(text, "experience"),
            sectionGuess(text, "project"),
            sectionGuess(text, "certification"),
            toolsGuess(text),
            sectionGuess(text, "language"),
            "",
            offered.isEmpty()
                ? "Can mentor peers on skills supported by uploaded resume evidence."
                : "Can mentor peers on " + joinSkillNames(offered) + ".",
            "Should build a focused learning path from resume gaps and available SkillEX mentors.",
            offered.stream().limit(10).toList(),
            wanted.stream().limit(8).toList(),
            signals,
            text.isBlank() ? 35 : 60
        );
    }

    private void addKeywordSkill(List<ResumeProfileDto.SkillSuggestion> skills, String lower, String name, String category, String level, String evidence) {
        String token = name.toLowerCase(Locale.ROOT);
        if (lower.contains(token) || ("SQL".equals(name) && lower.contains("database"))) {
            skills.add(new ResumeProfileDto.SkillSuggestion(name, category, level, evidence, 72));
        }
    }

    private List<ResumeProfileDto.ProfileSignal> extractFallbackSignals(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return text.lines()
            .map(String::trim)
            .filter(line -> line.length() >= 18 && line.length() <= 160)
            .filter(line -> line.startsWith("-") || line.startsWith("•") || line.toLowerCase(Locale.ROOT).contains("project"))
            .limit(6)
            .map(line -> new ResumeProfileDto.ProfileSignal("Resume evidence", cleanForProfile(line.replaceFirst("^[-•]\\s*", ""), 300)))
            .toList();
    }

    private void applyParsed(ResumeProfile profile, ParsedResumeProfile parsed) throws IOException {
        profile.setHeadline(cleanForProfile(parsed.headline(), 180));
        profile.setEducationSummary(cleanForProfile(parsed.educationSummary(), 1000));
        profile.setExperienceSummary(cleanForProfile(parsed.experienceSummary(), 1000));
        profile.setProjectSummary(cleanForProfile(parsed.projectSummary(), 1000));
        profile.setCertificationSummary(cleanForProfile(parsed.certificationSummary(), 1000));
        profile.setToolsSummary(cleanForProfile(parsed.toolsSummary(), 1000));
        profile.setLanguageSummary(cleanForProfile(parsed.languageSummary(), 1000));
        profile.setCareerGoal(cleanForProfile(parsed.careerGoal(), 1000));
        profile.setTeachSummary(cleanForProfile(parsed.teachSummary(), 500));
        profile.setLearnSummary(cleanForProfile(parsed.learnSummary(), 500));
        profile.setSuggestedOfferedSkillsJson(objectMapper.writeValueAsString(parsed.suggestedOfferedSkills()));
        profile.setSuggestedWantedSkillsJson(objectMapper.writeValueAsString(parsed.suggestedWantedSkills()));
        profile.setProfileSignalsJson(objectMapper.writeValueAsString(parsed.profileSignals()));
        profile.setConfidence(parsed.confidence());
    }

    private ResumeProfileDto toDto(ResumeProfile profile) {
        return new ResumeProfileDto(
            profile.getId(),
            profile.getUser().getId(),
            profile.getResumeUrl(),
            profile.getSourceFilename(),
            profile.getContentType(),
            profile.getExtractionMethod(),
            profile.getStatus(),
            profile.getHeadline(),
            profile.getEducationSummary(),
            profile.getExperienceSummary(),
            profile.getProjectSummary(),
            profile.getCertificationSummary(),
            profile.getToolsSummary(),
            profile.getLanguageSummary(),
            profile.getCareerGoal(),
            profile.getTeachSummary(),
            profile.getLearnSummary(),
            readJsonList(profile.getSuggestedOfferedSkillsJson(), SKILL_LIST_TYPE),
            readJsonList(profile.getSuggestedWantedSkillsJson(), SKILL_LIST_TYPE),
            readJsonList(profile.getProfileSignalsJson(), SIGNAL_LIST_TYPE),
            profile.getConfidence(),
            rawPreview(profile.getRawText()),
            profile.getCreatedAt(),
            profile.getUpdatedAt()
        );
    }

    private <T> List<T> readJsonList(String json, TypeReference<List<T>> type) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            return List.of();
        }
    }

    private String buildBio(ResumeProfile profile) {
        List<String> parts = new ArrayList<>();
        if (profile.getHeadline() != null && !profile.getHeadline().isBlank()) {
            parts.add(profile.getHeadline());
        }
        if (profile.getExperienceSummary() != null && !profile.getExperienceSummary().isBlank()) {
            parts.add(profile.getExperienceSummary());
        } else if (profile.getProjectSummary() != null && !profile.getProjectSummary().isBlank()) {
            parts.add(profile.getProjectSummary());
        }
        return cleanForProfile(String.join(" ", parts), 300);
    }

    private String normalizeExtractedText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.replace('\u00A0', ' ').replace("\r", "\n");
        normalized = MULTI_SPACE.matcher(normalized).replaceAll(" ");
        normalized = normalized.replaceAll("\\n{3,}", "\n\n");
        return normalized.trim();
    }

    private String fallbackHeadline(User user, String text) {
        if (user.getName() != null && !user.getName().isBlank()) {
            String firstSignal = text == null ? "" : text.lines()
                .map(String::trim)
                .filter(line -> line.length() >= 12 && line.length() <= 120)
                .findFirst()
                .orElse("");
            if (!firstSignal.isBlank() && !firstSignal.equalsIgnoreCase(user.getName())) {
                return user.getName() + " - " + firstSignal;
            }
            return user.getName() + " - SkillEX member";
        }
        return "SkillEX learner and mentor";
    }

    private String sectionGuess(String text, String heading) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String lowerHeading = heading.toLowerCase(Locale.ROOT);
        return text.lines()
            .map(String::trim)
            .filter(line -> line.toLowerCase(Locale.ROOT).contains(lowerHeading))
            .findFirst()
            .map(line -> cleanForProfile(line, 500))
            .orElse("");
    }

    private String toolsGuess(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String lower = text.toLowerCase(Locale.ROOT);
        List<String> tools = new ArrayList<>();
        for (String tool : List.of("Python", "Java", "React", "Spring Boot", "Django", "Flask", "SQL", "MySQL", "PostgreSQL", "Git", "Docker", "Figma", "TensorFlow")) {
            if (lower.contains(tool.toLowerCase(Locale.ROOT))) {
                tools.add(tool);
            }
        }
        return tools.isEmpty() ? "" : String.join(", ", tools);
    }

    private String joinSkillNames(List<ResumeProfileDto.SkillSuggestion> skills) {
        return skills.stream()
            .map(ResumeProfileDto.SkillSuggestion::name)
            .limit(5)
            .toList()
            .stream()
            .reduce((left, right) -> left + ", " + right)
            .orElse("resume-backed skills");
    }

    private String rawPreview(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return "";
        }
        return clip(rawText, 1800);
    }

    private String cleanForProfile(String value, int maxLength) {
        return clip(normalizeExtractedText(value), maxLength);
    }

    private String cleanCategory(String category) {
        String cleaned = category == null || category.isBlank() ? "Other" : category.trim();
        return clip(cleaned, 50);
    }

    private String normalizeLevel(String level) {
        if (level == null) {
            return "BEGINNER";
        }
        String normalized = level.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "MODERATE", "INTERMEDIATE" -> "MODERATE";
            case "EXPERT", "ADVANCED" -> "EXPERT";
            default -> "BEGINNER";
        };
    }

    private String normalizeContentType(String contentType, String filename) {
        String normalized = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT).trim();
        if (!normalized.isBlank() && !normalized.equals("application/octet-stream")) {
            return normalized;
        }
        String lowerName = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".pdf")) return "application/pdf";
        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
        if (lowerName.endsWith(".png")) return "image/png";
        if (lowerName.endsWith(".webp")) return "image/webp";
        return normalized;
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "application/pdf", "application/x-pdf" -> ".pdf";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        if (value.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (value[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    private String extractJsonObject(String response) {
        if (response == null || response.isBlank()) {
            return "{}";
        }
        String text = response.trim();
        if (text.contains("```json")) {
            text = text.substring(text.indexOf("```json") + 7);
            text = text.substring(0, text.indexOf("```"));
        } else if (text.contains("```")) {
            text = text.substring(text.indexOf("```") + 3);
            text = text.substring(0, text.indexOf("```"));
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return start >= 0 && end > start ? text.substring(start, end + 1) : text;
    }

    private String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String clip(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, Math.max(0, maxLength - 1)).trim();
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private record StoredResume(Path path, String url, String contentType) {}

    private record ExtractedText(String text, String method) {}

    private record ParsedResumeProfile(
        String headline,
        String educationSummary,
        String experienceSummary,
        String projectSummary,
        String certificationSummary,
        String toolsSummary,
        String languageSummary,
        String careerGoal,
        String teachSummary,
        String learnSummary,
        List<ResumeProfileDto.SkillSuggestion> suggestedOfferedSkills,
        List<ResumeProfileDto.SkillSuggestion> suggestedWantedSkills,
        List<ResumeProfileDto.ProfileSignal> profileSignals,
        int confidence
    ) {}
}
