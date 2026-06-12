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
    private static final Pattern TEMPLATE_PLACEHOLDER = Pattern.compile("\\[[^\\]]{1,60}\\]");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?:\\+?\\d[\\d\\s\\-().]{7,}\\d)");
    private static final Pattern ADDRESS_KEYWORDS = Pattern.compile("(?i)dhaka|chittagong|sylhet|rajshahi|khulna|bangladesh|india|usa|uk|london|new york|delhi|mumbai|road|avenue|street|district|thana|upazila|village|floor|flat|house|block");
    /**
     * Words too generic to prove a skill suggestion came from this resume.
     * Single-word skills that literally appear in the resume still pass via
     * the exact-name check in {@link #isGroundedInResume}.
     */
    private static final Set<String> GENERIC_GROUNDING_TOKENS = Set.of(
        "development", "developer", "developed", "developing", "management", "manager", "managed",
        "experience", "experienced", "professional", "project", "projects", "skill", "skills",
        "skilled", "knowledge", "working", "worked", "demonstrated", "demonstrating", "proficiency",
        "proficient", "communication", "university", "international", "engineering", "engineer",
        "general", "basic", "advanced", "expert", "beginner", "moderate", "resume", "mentions",
        "using", "used", "with", "from", "team", "years", "strong", "various", "multiple"
    );

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
        if (request.learnIntentText() != null && !request.learnIntentText().isBlank()) {
            user.setLearnIntentText(cleanForProfile(request.learnIntentText(), 500));
        }
        if (Boolean.TRUE.equals(request.applyContact())) {
            if (profile.getPhone() != null && !profile.getPhone().isBlank()) {
                user.setPhone(clip(profile.getPhone(), 50));
            }
            if (profile.getAddress() != null && !profile.getAddress().isBlank()) {
                user.setAddress(clip(profile.getAddress(), 300));
            }
        }
        if (profile.getResumeUrl() != null && !profile.getResumeUrl().isBlank()) {
            user.setResumeUrl(profile.getResumeUrl());
        }
        userRepository.save(user);

        applySkills(userId, request.offeredSkills(), "offered");

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
            Extract structured SkillEX profile data from the resume/CV text below.

            STRICT GROUNDING RULES:
            - Return ONLY valid JSON. No markdown fences.
            - Every field MUST be built from words and facts that actually appear in the resume text.
              Quote or closely paraphrase the resume. Do NOT invent employers, industries, degrees,
              certificates, tools, projects, or skills the resume does not mention.
            - Mirror the person's real domain. If the resume is about garments, merchandising, nursing,
              accounting, teaching, or any other field, the output must describe that field.
              Never default to software development.
            - Never output template placeholders such as [Project Name] or [Company], and never copy
              wording from these instructions into the output.
            - If the resume has no information for a field, return an empty string "" for that field.
            - suggestedOfferedSkills are skills this person can credibly teach or mentor. Each one must
              cite real resume evidence: the "evidence" value must reference the actual resume line.
            - Keep skill names concise and searchable.
            - level must be BEGINNER, MODERATE, or EXPERT.
            - confidence is 0-100.

            JSON schema (replace every <angle-bracket description> with real extracted text):
            {
              "headline": "<job title or professional identity line from resume>",
              "email": "<email address found in resume, or ''>",
              "phone": "<phone number found in resume, or ''>",
              "address": "<city, country, or address found in resume, or ''>",
              "educationSummary": "<degree, institution, year — exactly as written in the resume, or ''>",
              "experienceSummary": "<job titles, companies, dates — exactly as listed, or ''>",
              "projectSummary": "<project titles and brief descriptions — exactly as listed, or ''>",
              "certificationSummary": "<certifications, courses, training — exactly as listed, or ''>",
              "toolsSummary": "<tools, software, machines, platforms — exactly as listed, or ''>",
              "languageSummary": "<spoken/written languages and levels — exactly as listed, or ''>",
              "careerGoal": "<objective or summary statement — exactly as written, or ''>",
              "teachSummary": "<one sentence: what this person can credibly teach, citing resume evidence>",
              "suggestedOfferedSkills": [
                {"name":"<skill name>","category":"<Tech, Business, Creative, General, or Other>","level":"<BEGINNER, MODERATE, or EXPERT>","evidence":"<exact resume line that proves this skill>","confidence":0}
              ],
              "profileSignals": [
                {"label":"<short label e.g. GPA, Award, Achievement>","value":"<exact quoted line from resume>"}
              ],
              "confidence": 0
            }

            User profile context (do not copy into the output unless the resume supports it):
            Name: %s
            University: %s

            Resume text:
            %s
            """.formatted(
            nullToEmpty(user.getName()),
            nullToEmpty(user.getUniversity()),
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
        List<ResumeProfileDto.SkillSuggestion> offered =
            keepGroundedSuggestions(parseSkillSuggestions(root.path("suggestedOfferedSkills")), rawText);
        List<ResumeProfileDto.ProfileSignal> signals =
            keepGroundedSignals(parseSignals(root.path("profileSignals")), rawText);

        if (offered.isEmpty()) {
            ParsedResumeProfile fallback = fallbackParsedProfile(user, rawText);
            offered = fallback.suggestedOfferedSkills();
            signals = fallback.profileSignals();
        }

        List<String> allLines = (rawText == null ? "" : rawText).lines()
            .map(String::trim).filter(l -> !l.isBlank()).toList();

        return new ParsedResumeProfile(
            firstNonBlank(dropTemplated(root.path("headline").asText("")),
                extractFallbackHeadline(user, allLines)),
            firstNonBlank(dropTemplated(root.path("email").asText("")), extractEmail(rawText)),
            firstNonBlank(dropTemplated(root.path("phone").asText("")), extractPhone(rawText)),
            dropTemplated(root.path("address").asText("")),
            dropTemplated(root.path("educationSummary").asText("")),
            dropTemplated(root.path("experienceSummary").asText("")),
            dropTemplated(root.path("projectSummary").asText("")),
            dropTemplated(root.path("certificationSummary").asText("")),
            dropTemplated(root.path("toolsSummary").asText("")),
            dropTemplated(root.path("languageSummary").asText("")),
            dropTemplated(root.path("careerGoal").asText("")),
            dropTemplated(root.path("teachSummary").asText("")),
            offered,
            signals,
            clamp(root.path("confidence").asInt(70), 0, 100)
        );
    }

    /**
     * Models (especially small local ones) sometimes echo schema examples or
     * generic filler instead of the actual resume. A suggestion is only kept
     * when its name appears in the resume verbatim, or when its name/evidence
     * shares a distinctive word with the resume text.
     */
    private List<ResumeProfileDto.SkillSuggestion> keepGroundedSuggestions(
        List<ResumeProfileDto.SkillSuggestion> suggestions,
        String rawText
    ) {
        String lowerResume = rawText == null ? "" : rawText.toLowerCase(Locale.ROOT);
        if (lowerResume.isBlank()) {
            return suggestions;
        }
        List<ResumeProfileDto.SkillSuggestion> grounded = suggestions.stream()
            .filter(skill -> isGroundedInResume(skill.name(), skill.evidence(), lowerResume))
            .toList();
        if (grounded.size() < suggestions.size()) {
            log.info("Resume parser dropped {} ungrounded skill suggestion(s).", suggestions.size() - grounded.size());
        }
        return grounded;
    }

    private List<ResumeProfileDto.ProfileSignal> keepGroundedSignals(
        List<ResumeProfileDto.ProfileSignal> signals,
        String rawText
    ) {
        String lowerResume = rawText == null ? "" : rawText.toLowerCase(Locale.ROOT);
        if (lowerResume.isBlank()) {
            return signals;
        }
        return signals.stream()
            .filter(signal -> isGroundedInResume(signal.label(), signal.value(), lowerResume))
            .toList();
    }

    private boolean isGroundedInResume(String name, String evidence, String lowerResume) {
        String lowerName = name == null ? "" : normalizeExtractedText(name).toLowerCase(Locale.ROOT);
        if (!lowerName.isBlank() && lowerResume.contains(lowerName)) {
            return true;
        }
        return hasDistinctiveResumeToken(lowerName, lowerResume)
            || hasDistinctiveResumeToken(evidence, lowerResume);
    }

    private boolean hasDistinctiveResumeToken(String value, String lowerResume) {
        if (value == null || value.isBlank()) {
            return false;
        }
        for (String token : value.toLowerCase(Locale.ROOT).split("[^a-z0-9+#]+")) {
            if (token.length() >= 4 && !GENERIC_GROUNDING_TOKENS.contains(token) && lowerResume.contains(token)) {
                return true;
            }
        }
        return false;
    }

    /** Strings containing template placeholders like "[Project Name]" are model filler, not resume data. */
    private String dropTemplated(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return TEMPLATE_PLACEHOLDER.matcher(value).find() ? "" : value;
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

        List<String> allLines = text.lines().map(String::trim).filter(l -> !l.isBlank()).toList();

        String headline = extractFallbackHeadline(user, allLines);
        String educationSummary = extractSectionContent(allLines, "education", "degree", "bsc", "bba", "ba ", "mba", "university", "college", "school");
        String experienceSummary = extractSectionContent(allLines, "experience", "work", "employment", "career", "position", "job");
        String projectSummary = extractSectionContent(allLines, "project", "portfolio", "internship");
        String certSummary = extractSectionContent(allLines, "certification", "certificate", "license", "training", "course");
        String toolsSummary = extractToolsFromText(allLines);
        String languageSummary = extractSectionContent(allLines, "language", "linguistic", "fluent", "proficient in");
        String careerGoal = extractSectionContent(allLines, "objective", "goal", "summary", "profile", "career");

        List<ResumeProfileDto.SkillSuggestion> offered = extractSkillsFromResumeBullets(allLines);
        List<ResumeProfileDto.ProfileSignal> signals = extractFallbackSignals(allLines);

        String teachSummary = offered.isEmpty() ? "" : "Can teach " + joinSkillNames(offered) + " based on resume evidence.";

        return new ParsedResumeProfile(
            headline,
            extractEmail(text),
            extractPhone(text),
            extractAddress(allLines),
            educationSummary,
            experienceSummary,
            projectSummary,
            certSummary,
            toolsSummary,
            languageSummary,
            careerGoal,
            teachSummary,
            offered.stream().limit(10).toList(),
            signals,
            text.isBlank() ? 35 : 55
        );
    }

    /**
     * Extracts the first line that isn't just the user's name and looks like a
     * professional title or role — no fixed "SkillEX member" fallback text.
     */
    private String extractFallbackHeadline(User user, List<String> lines) {
        String nameLower = user.getName() == null ? "" : user.getName().toLowerCase(Locale.ROOT).trim();
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() < 5 || trimmed.length() > 120) continue;
            if (!nameLower.isBlank() && trimmed.toLowerCase(Locale.ROOT).contains(nameLower)) continue;
            // Prefer lines that look like a role/title (not an address, phone, email)
            if (trimmed.matches(".*@.*") || trimmed.matches(".*\\d{5,}.*")) continue;
            if (!nameLower.isBlank()) return user.getName() + " — " + trimmed;
            return trimmed;
        }
        return nameLower.isBlank() ? "" : user.getName();
    }

    /**
     * Finds a section by any of its heading keywords, then returns the content lines
     * immediately following it (not the heading line itself).
     */
    private String extractSectionContent(List<String> lines, String... headingKeywords) {
        boolean inSection = false;
        List<String> content = new ArrayList<>();
        for (String line : lines) {
            String lower = line.toLowerCase(Locale.ROOT);
            boolean isHeading = false;
            for (String kw : headingKeywords) {
                if (lower.contains(kw) && line.length() <= 60) {
                    isHeading = true;
                    break;
                }
            }
            if (isHeading) {
                if (!content.isEmpty()) break; // already collected a prior section
                inSection = true;
                continue;
            }
            if (inSection) {
                // Stop when we hit what looks like the next section heading
                if (line.length() <= 50 && line.equals(line.toUpperCase(Locale.ROOT)) && line.matches("[A-Z ]{3,}")) break;
                if (line.length() <= 40 && line.endsWith(":")) break;
                content.add(line);
                if (content.size() >= 5) break;
            }
        }
        return content.isEmpty() ? "" : String.join(" ", content);
    }

    /**
     * Extracts tool/software/platform names from a skills or tools section, or from
     * comma-separated lists anywhere in the CV. Does not check a fixed tool list.
     */
    private String extractToolsFromText(List<String> lines) {
        boolean inToolsSection = false;
        List<String> found = new ArrayList<>();
        for (String line : lines) {
            String lower = line.toLowerCase(Locale.ROOT);
            if ((lower.contains("skill") || lower.contains("tool") || lower.contains("software") || lower.contains("technical"))
                && line.length() <= 60) {
                inToolsSection = true;
                continue;
            }
            if (inToolsSection) {
                if (line.length() <= 50 && line.equals(line.toUpperCase(Locale.ROOT))) break;
                // Comma or slash separated → treat as tool list
                if (line.contains(",") || line.contains("/") || line.contains("|")) {
                    for (String part : line.split("[,/|•]")) {
                        String t = part.replaceFirst("^[-•\\s]+", "").trim();
                        if (t.length() >= 2 && t.length() <= 40) found.add(t);
                    }
                } else {
                    found.add(line);
                }
                if (found.size() >= 12) break;
            }
        }
        return found.isEmpty() ? "" : String.join(", ", found.stream().limit(10).toList());
    }

    /**
     * Extracts skill suggestions from actual resume bullet points. Every skill
     * is named and evidenced from the real text — no hardcoded keyword list.
     */
    private List<ResumeProfileDto.SkillSuggestion> extractSkillsFromResumeBullets(List<String> lines) {
        List<ResumeProfileDto.SkillSuggestion> skills = new ArrayList<>();
        // Skills/Competencies section → each entry is a skill
        boolean inSkillSection = false;
        for (String line : lines) {
            String lower = line.toLowerCase(Locale.ROOT);
            if ((lower.contains("skill") || lower.contains("competenc") || lower.contains("expertise") || lower.contains("qualification"))
                && line.length() <= 60) {
                inSkillSection = true;
                continue;
            }
            if (inSkillSection) {
                if (line.length() <= 50 && line.equals(line.toUpperCase(Locale.ROOT))) break;
                String[] parts = line.split("[,/|•\\-]");
                for (String part : parts) {
                    String name = part.trim().replaceFirst("^\\s*[-•]\\s*", "").trim();
                    if (name.length() >= 3 && name.length() <= 60 && !name.matches("\\d+.*")) {
                        skills.add(new ResumeProfileDto.SkillSuggestion(name, "Other", "MODERATE", line, 65));
                    }
                    if (skills.size() >= 8) break;
                }
                if (skills.size() >= 8) break;
            }
        }
        // Supplement with strong action lines if skills section was sparse
        if (skills.size() < 3) {
            for (String line : lines) {
                if (line.length() < 25 || line.length() > 150) continue;
                String clean = line.replaceFirst("^[-•]\\s*", "").trim();
                if (clean.length() >= 10) {
                    skills.add(new ResumeProfileDto.SkillSuggestion(
                        clean.length() <= 40 ? clean : clean.substring(0, 40),
                        "Other", "MODERATE", clean, 55
                    ));
                    if (skills.size() >= 6) break;
                }
            }
        }
        return skills;
    }

    private List<ResumeProfileDto.ProfileSignal> extractFallbackSignals(List<String> lines) {
        return lines.stream()
            .filter(line -> line.length() >= 20 && line.length() <= 180)
            .filter(line -> line.startsWith("-") || line.startsWith("•")
                || line.matches(".*\\d{4}.*") // dates suggest real facts
                || line.contains(":"))
            .limit(6)
            .map(line -> new ResumeProfileDto.ProfileSignal(
                "Resume",
                cleanForProfile(line.replaceFirst("^[-•]\\s*", ""), 300)
            ))
            .toList();
    }

    private void applyParsed(ResumeProfile profile, ParsedResumeProfile parsed) throws IOException {
        profile.setHeadline(cleanForProfile(parsed.headline(), 180));
        profile.setEmail(clip(parsed.email(), 255));
        profile.setPhone(clip(parsed.phone(), 50));
        profile.setAddress(clip(parsed.address(), 300));
        profile.setEducationSummary(cleanForProfile(parsed.educationSummary(), 1000));
        profile.setExperienceSummary(cleanForProfile(parsed.experienceSummary(), 1000));
        profile.setProjectSummary(cleanForProfile(parsed.projectSummary(), 1000));
        profile.setCertificationSummary(cleanForProfile(parsed.certificationSummary(), 1000));
        profile.setToolsSummary(cleanForProfile(parsed.toolsSummary(), 1000));
        profile.setLanguageSummary(cleanForProfile(parsed.languageSummary(), 1000));
        profile.setCareerGoal(cleanForProfile(parsed.careerGoal(), 1000));
        profile.setTeachSummary(cleanForProfile(parsed.teachSummary(), 500));
        // Learn intent is no longer guessed from resumes; users state it themselves
        // in the Skills tab, where smart semantic matching maps it to real skills.
        profile.setLearnSummary("");
        profile.setSuggestedOfferedSkillsJson(objectMapper.writeValueAsString(parsed.suggestedOfferedSkills()));
        profile.setSuggestedWantedSkillsJson("[]");
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
            profile.getEmail(),
            profile.getPhone(),
            profile.getAddress(),
            profile.getEducationSummary(),
            profile.getExperienceSummary(),
            profile.getProjectSummary(),
            profile.getCertificationSummary(),
            profile.getToolsSummary(),
            profile.getLanguageSummary(),
            profile.getCareerGoal(),
            profile.getTeachSummary(),
            readJsonList(profile.getSuggestedOfferedSkillsJson(), SKILL_LIST_TYPE),
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

    private String extractEmail(String text) {
        if (text == null || text.isBlank()) return "";
        java.util.regex.Matcher m = EMAIL_PATTERN.matcher(text);
        return m.find() ? m.group().trim() : "";
    }

    private String extractPhone(String text) {
        if (text == null || text.isBlank()) return "";
        java.util.regex.Matcher m = PHONE_PATTERN.matcher(text);
        while (m.find()) {
            String candidate = m.group().trim();
            // require at least 7 digits
            if (candidate.replaceAll("\\D", "").length() >= 7) {
                return candidate;
            }
        }
        return "";
    }

    private String extractAddress(List<String> lines) {
        for (String line : lines) {
            if (line.length() > 5 && line.length() <= 200 && ADDRESS_KEYWORDS.matcher(line).find()) {
                // Skip lines that are clearly just names or education lines
                if (!line.matches(".*(?:BSc|BBA|BA|MSc|MBA|University|College|School|GPA|CGPA).*")) {
                    return line;
                }
            }
        }
        return "";
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
        String email,
        String phone,
        String address,
        String educationSummary,
        String experienceSummary,
        String projectSummary,
        String certificationSummary,
        String toolsSummary,
        String languageSummary,
        String careerGoal,
        String teachSummary,
        List<ResumeProfileDto.SkillSuggestion> suggestedOfferedSkills,
        List<ResumeProfileDto.ProfileSignal> profileSignals,
        int confidence
    ) {}
}
