package com.skillex.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.ai.SkillGapAnalysisDto;
import com.skillex.dto.ai.SkillGapDto;
import com.skillex.dto.user.AddSkillRequest;
import com.skillex.dto.user.AddSkillResult;
import com.skillex.model.ResumeProfile;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.repository.ResumeProfileRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.service.SkillCatalogGovernanceService;
import com.skillex.service.NoteGenerationService;
import com.skillex.service.SkillGapAnalyzerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillGapAnalyzerServiceImpl implements SkillGapAnalyzerService {
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferedRepository userSkillOfferedRepository;
    private final ResumeProfileRepository resumeProfileRepository;
    private final SkillCatalogGovernanceService governanceService;
    private final NoteGenerationService noteGenerationService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public SkillGapAnalysisDto analyzeGap(String userId, String goalSkillId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Skill goalSkill = skillRepository.findById(goalSkillId)
            .orElseThrow(() -> new IllegalArgumentException("Goal skill not found"));

        List<Skill> currentSkills = user.getSkillsOffered() != null
            ? user.getSkillsOffered()
            : new ArrayList<>();
        List<String> currentSkillNames = currentSkills.stream()
            .map(Skill::getName)
            .toList();

        SkillGapAnalysisDto.LearningPath path = generatePath(goalSkill.getName(), currentSkillNames, buildProfileContext(userId));

        Set<String> currentSet = currentSkills.stream()
            .map(skill -> skill.getName().toLowerCase())
            .collect(Collectors.toSet());

        List<SkillGapDto> gaps = path.steps().stream()
            .filter(step -> !currentSet.contains(step.skillName().toLowerCase()))
            .map(step -> buildGapDto(step.skillName(), step.rationale()))
            .toList();

        String summary = path.reasoning() == null || path.reasoning().isBlank()
            ? String.format(
                "AI mapped %d step%s toward %s.",
                path.steps().size(),
                path.steps().size() == 1 ? "" : "s",
                goalSkill.getName()
            )
            : path.reasoning();

        return new SkillGapAnalysisDto(
            goalSkillId,
            goalSkill.getName(),
            currentSkillNames,
            gaps,
            path,
            summary
        );
    }

    @Override
    @Transactional
    public SkillGapAnalysisDto analyzeCustomGoal(String userId, String goalSkillName, String category) {
        String normalizedGoal = normalizeGoalName(goalSkillName);
        Skill existing = skillRepository.findByNameIgnoreCase(normalizedGoal).orElse(null);
        if (existing != null) {
            return analyzeGap(userId, existing.getId());
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<Skill> currentSkills = user.getSkillsOffered() != null
            ? user.getSkillsOffered()
            : new ArrayList<>();
        List<String> currentSkillNames = currentSkills.stream()
            .map(Skill::getName)
            .toList();

        AddSkillResult submission = governanceService.submitUnknownSkill(
            userId,
            new AddSkillRequest(
                null,
                normalizedGoal,
                category == null || category.isBlank() ? "Other" : category.trim(),
                "Requested from Skill Gap Analyzer",
                "Skill Gap Analyzer custom goal: " + normalizedGoal,
                80,
                true,
                "BEGINNER",
                "wanted",
                null,
                null
            )
        );

        SkillGapAnalysisDto.LearningPath path = generatePath(normalizedGoal, currentSkillNames, buildProfileContext(userId));
        Set<String> currentSet = currentSkills.stream()
            .map(skill -> skill.getName().toLowerCase(Locale.ROOT))
            .collect(Collectors.toSet());

        List<SkillGapDto> gaps = path.steps().stream()
            .filter(step -> !currentSet.contains(step.skillName().toLowerCase(Locale.ROOT)))
            .map(step -> buildGapDto(step.skillName(), step.rationale()))
            .toList();

        String statusNote = submission.skillId() != null
            ? "The custom goal has been added to the catalog."
            : "This custom skill was submitted for catalog review; mentor-backed booking starts after approval.";

        return new SkillGapAnalysisDto(
            submission.skillId(),
            normalizedGoal,
            currentSkillNames,
            gaps,
            path,
            path.reasoning() + " " + statusNote
        );
    }

    @Override
    public SkillGapAnalysisDto.LearningPath generatePath(String goalSkillName, List<String> currentSkillNames) {
        return generatePath(goalSkillName, currentSkillNames, "");
    }

    private SkillGapAnalysisDto.LearningPath generatePath(String goalSkillName, List<String> currentSkillNames, String profileContext) {
        List<String> catalog = skillRepository.findAll().stream()
            .map(skill -> skill.getName() + " [" + skill.getCategory() + "]")
            .limit(120)
            .toList();

        String prompt = String.format("""
            You are SkillEX's AI learning architect.

            Goal skill: "%s"
            User already knows: %s
            Resume/profile evidence: %s
            Skill catalog options: %s

            Generate a practical, personalized skill-gap plan.
            Rules:
            - Return ONLY valid JSON. No markdown, no explanation outside JSON.
            - Use 4 to 6 ordered steps for broad skills, 3 to 5 for narrow skills.
            - Prefer exact skill names from the catalog when possible.
            - If the catalog does not contain a needed sub-skill, use a clear human-readable sub-skill.
            - Do not return vague steps like "learn basics" unless the skill name is specific.
            - Skip skills the user already knows unless a deeper version is truly required.
            - Each reason must explain why this step closes the gap toward the goal.
            - Each step must be actionable inside SkillEX: mentor session, practice proof, certificate, XP, or portfolio proof.
            - Use profile evidence to personalize prerequisites, but do not claim the user knows a skill unless it appears in their current skills or resume evidence.
            - Hours must be realistic for focused peer learning.

            JSON schema:
            {
              "summary": "Brief explanation of the path",
              "steps": [
                {
                  "order": 1,
                  "skillName": "Exact Skill Name",
                  "hours": 10,
                  "reason": "Why this step is needed",
                  "learningOutcome": "Exact outcome the user should achieve",
                  "practiceTask": "Concrete task or mini-project",
                  "suggestedSessionTitle": "SkillEX mentor/session title to look for",
                  "completionProof": "What proof should be uploaded or checked",
                  "nextStepDependency": "What this unlocks next",
                  "platformAction": "What to do next inside SkillEX"
                }
              ]
            }
            """,
            goalSkillName,
            currentSkillNames.isEmpty() ? "nothing yet" : String.join(", ", currentSkillNames),
            profileContext == null || profileContext.isBlank() ? "no resume profile imported yet" : profileContext,
            catalog.isEmpty() ? "none" : String.join(", ", catalog)
        );

        String response = noteGenerationService.generateWithOllama(prompt);
        return parsePathJson(response, goalSkillName);
    }

    private SkillGapAnalysisDto.LearningPath parsePathJson(String jsonResponse, String goalSkill) {
        try {
            JsonNode root = objectMapper.readTree(extractJsonObject(jsonResponse));
            JsonNode stepNodes = root.path("steps");
            List<SkillGapAnalysisDto.PathStep> steps = new ArrayList<>();
            int order = 1;

            if (stepNodes.isArray()) {
                for (JsonNode node : stepNodes) {
                    String skillName = firstText(node, "skillName", "skill", "name");
                    if (skillName.isBlank()) {
                        continue;
                    }

                    int hours = node.path("hours").asInt(node.path("estimatedHours").asInt(10));
                    String reason = firstText(node, "reason", "rationale", "description");
                    String learningOutcome = firstText(node, "learningOutcome", "outcome");
                    String practiceTask = firstText(node, "practiceTask", "project", "task");
                    String suggestedSessionTitle = firstText(node, "suggestedSessionTitle", "suggestedSession", "mentorSession");
                    String completionProof = firstText(node, "completionProof", "proof");
                    String nextStepDependency = firstText(node, "nextStepDependency", "dependency");
                    String platformAction = firstText(node, "platformAction", "nextAction");
                    Skill skill = skillRepository.findByNameIgnoreCase(skillName).orElse(null);
                    String skillId = skill != null ? skill.getId() : null;

                    steps.add(new SkillGapAnalysisDto.PathStep(
                        order++,
                        skillName.trim(),
                        skillId,
                        reason.isBlank() ? "AI identified this as an essential bridge skill." : reason.trim(),
                        learningOutcome.isBlank() ? "Use this skill confidently in a guided SkillEX practice task." : learningOutcome.trim(),
                        practiceTask.isBlank() ? "Build a small portfolio proof that demonstrates this step." : practiceTask.trim(),
                        suggestedSessionTitle.isBlank() ? "Book a mentor walkthrough for " + skillName.trim() : suggestedSessionTitle.trim(),
                        completionProof.isBlank() ? "Upload a short note, project link, or mentor-verified proof." : completionProof.trim(),
                        nextStepDependency.isBlank() ? "This prepares you for the next ordered step." : nextStepDependency.trim(),
                        platformAction.isBlank() ? "Find a mentor, attend a session, then mark this step complete." : platformAction.trim(),
                        Math.max(3, Math.min(hours, 40)),
                        skillId != null ? findMentorsForSkill(skillId, 3) : new ArrayList<>()
                    ));
                }
            }

            if (steps.isEmpty()) {
                steps.add(new SkillGapAnalysisDto.PathStep(
                    1,
                    goalSkill + " Fundamentals",
                    null,
                    "AI could not map catalog steps, so start with the fundamentals.",
                    "Understand the core vocabulary, workflow, and success criteria.",
                    "Create a one-page concept map and one tiny practice artifact.",
                    "Beginner mentor walkthrough for " + goalSkill,
                    "Upload the concept map or practice artifact to your portfolio.",
                    "Required before moving into applied practice.",
                    "Search mentors for this topic and request a short intro session.",
                    10,
                    new ArrayList<>()
                ));
            }

            if (steps.size() < 3) {
                addAppliedGoalStep(steps, goalSkill);
            }

            int totalHours = steps.stream().mapToInt(SkillGapAnalysisDto.PathStep::estimatedHours).sum();
            return new SkillGapAnalysisDto.LearningPath(
                steps,
                Math.max(totalHours, 10),
                root.path("summary").asText("Personalized learning path generated by AI.")
            );
        } catch (Exception e) {
            return new SkillGapAnalysisDto.LearningPath(
                List.of(new SkillGapAnalysisDto.PathStep(
                    1,
                    goalSkill + " Fundamentals",
                    null,
                    "AI output could not be parsed, so start with the fundamentals.",
                    "Understand the core vocabulary, workflow, and success criteria.",
                    "Create a one-page concept map and one tiny practice artifact.",
                    "Beginner mentor walkthrough for " + goalSkill,
                    "Upload the concept map or practice artifact to your portfolio.",
                    "Required before moving into applied practice.",
                    "Search mentors for this topic and request a short intro session.",
                    10,
                    new ArrayList<>()
                )),
                10,
                "AI generation encountered an issue; this fallback keeps the workflow usable."
            );
        }
    }

    private void addAppliedGoalStep(List<SkillGapAnalysisDto.PathStep> steps, String goalSkill) {
        boolean alreadyHasGoal = steps.stream()
            .anyMatch(step -> step.skillName().equalsIgnoreCase(goalSkill));
        String skillName = alreadyHasGoal ? "Applied " + goalSkill + " Project" : goalSkill;
        Skill skill = skillRepository.findByNameIgnoreCase(skillName)
            .or(() -> skillRepository.findByNameIgnoreCase(goalSkill))
            .orElse(null);
        String skillId = skill != null ? skill.getId() : null;

        steps.add(new SkillGapAnalysisDto.PathStep(
            steps.size() + 1,
            skillName,
            skillId,
            "Apply the earlier steps in a guided project so the goal becomes usable, not only theoretical.",
            "Turn the prerequisites into a usable result that proves goal readiness.",
            "Build a focused project or demo that uses the earlier steps together.",
            "Project review session for " + goalSkill,
            "Submit a portfolio proof, mentor review, or certificate evidence.",
            "This is the final dependency before claiming the goal skill.",
            "Book a review session, upload proof, and request verification.",
            12,
            skillId != null ? findMentorsForSkill(skillId, 3) : new ArrayList<>()
        ));
    }

    private String buildProfileContext(String userId) {
        return resumeProfileRepository.findByUserId(userId)
            .map(this::renderProfileContext)
            .orElse("");
    }

    private String renderProfileContext(ResumeProfile profile) {
        List<String> parts = new ArrayList<>();
        appendContext(parts, "Headline", profile.getHeadline());
        appendContext(parts, "Experience", profile.getExperienceSummary());
        appendContext(parts, "Projects", profile.getProjectSummary());
        appendContext(parts, "Education", profile.getEducationSummary());
        appendContext(parts, "Tools", profile.getToolsSummary());
        appendContext(parts, "Career goal", profile.getCareerGoal());
        appendContext(parts, "Can teach", profile.getTeachSummary());
        appendContext(parts, "Wants to learn", profile.getLearnSummary());
        appendContext(parts, "Offered skill suggestions", profile.getSuggestedOfferedSkillsJson());
        appendContext(parts, "Wanted skill suggestions", profile.getSuggestedWantedSkillsJson());
        return parts.stream()
            .filter(part -> part != null && !part.isBlank())
            .map(part -> part.length() > 1200 ? part.substring(0, 1200) : part)
            .collect(Collectors.joining("\n"));
    }

    private void appendContext(List<String> parts, String label, String value) {
        if (value != null && !value.isBlank()) {
            parts.add(label + ": " + value.trim());
        }
    }

    private SkillGapDto buildGapDto(String skillName, String reason) {
        Skill skill = skillRepository.findByNameIgnoreCase(skillName).orElse(null);
        List<String> mentorNames = skill != null ? findMentorNamesForSkill(skill.getId()) : List.of();

        return new SkillGapDto(
            skill != null ? skill.getId() : null,
            skillName,
            skill != null ? skill.getCategory() : "General",
            0.75,
            reason,
            mentorNames,
            mentorNames.size()
        );
    }

    private List<SkillGapAnalysisDto.MentorMatch> findMentorsForSkill(String skillId, int limit) {
        try {
            List<UserSkillOffered> offers = userSkillOfferedRepository.findBySkillId(skillId);

            return offers.stream()
                .limit(limit)
                .map(offer -> {
                    User mentor = offer.getUser();
                    int sessions = mentor.getSessionsCompleted() != null ? mentor.getSessionsCompleted() : 0;
                    double rating = mentor.getRating() != null ? mentor.getRating().doubleValue() : 0.0;

                    return new SkillGapAnalysisDto.MentorMatch(
                        mentor.getId(),
                        mentor.getName(),
                        mentor.getAvatar(),
                        sessions >= 3 && rating >= 4.0 ? 75.0 : 50.0,
                        sessions,
                        rating,
                        String.format("%d sessions, %.1f rating", sessions, rating)
                    );
                })
                .toList();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<String> findMentorNamesForSkill(String skillId) {
        try {
            return userSkillOfferedRepository.findBySkillId(skillId).stream()
                .limit(3)
                .map(offer -> offer.getUser().getName())
                .toList();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String normalizeGoalName(String rawGoal) {
        if (rawGoal == null) {
            throw new IllegalArgumentException("Goal skill name is required.");
        }
        String normalized = rawGoal.replaceAll("\\s+", " ").trim();
        if (normalized.isBlank() || normalized.length() < 2) {
            throw new IllegalArgumentException("Goal skill name is required.");
        }
        if (normalized.length() > 100) {
            normalized = normalized.substring(0, 100).trim();
        }
        return normalized;
    }

    private String firstText(JsonNode node, String... keys) {
        for (String key : keys) {
            String value = node.path(key).asText("");
            if (!value.isBlank()) {
                return value;
            }
        }
        return "";
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
}
