package com.skillex.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.ai.LearningPathDto;
import com.skillex.model.LearningPath;
import com.skillex.model.LearningPathStep;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffered;
import com.skillex.repository.LearningPathRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferedRepository;
import com.skillex.service.LearningPathService;
import com.skillex.service.NoteGenerationService;
import com.skillex.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class LearningPathServiceImpl implements LearningPathService {
    private final LearningPathRepository learningPathRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferedRepository userSkillOfferedRepository;
    private final NoteGenerationService noteGenerationService;
    private final ProgressService progressService;
    private final ObjectMapper objectMapper;

    @Override
    public LearningPathDto generateAndSchedulePath(String userId, String goalSkillId, String targetLevel) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Skill goalSkill = skillRepository.findById(goalSkillId)
            .orElseThrow(() -> new IllegalArgumentException("Goal skill not found"));

        List<LearningPathDto.PathStepWithMentor> pathSteps = generatePathSteps(goalSkill, user, targetLevel);
        if (pathSteps.isEmpty()) {
            throw new IllegalStateException("Could not generate a mentor-backed learning path for this skill yet.");
        }

        LearningPath path = LearningPath.builder()
            .user(user)
            .goalSkill(goalSkill)
            .targetLevel(targetLevel)
            .totalEstimatedHours(pathSteps.stream().mapToInt(LearningPathDto.PathStepWithMentor::estimatedHours).sum())
            .estimatedCompletionAt(LocalDateTime.now().plusDays(pathSteps.size() * 7L))
            .status("ACTIVE")
            .build();

        List<LearningPathStep> steps = new ArrayList<>();
        for (int i = 0; i < pathSteps.size(); i++) {
            LearningPathDto.PathStepWithMentor pathStep = pathSteps.get(i);
            Skill stepSkill = skillRepository.findById(pathStep.skillId()).orElseThrow();
            User mentor = userRepository.findById(pathStep.mentorId()).orElseThrow();

            steps.add(LearningPathStep.builder()
                .learningPath(path)
                .skill(stepSkill)
                .mentor(mentor)
                .stepOrder(i + 1)
                .estimatedHours(pathStep.estimatedHours())
                .description(pathStep.description())
                .scheduledSessionAt(LocalDateTime.now().plusDays((long) (i + 1) * 7))
                .build());
        }

        path.setSteps(steps);
        path = learningPathRepository.save(path);

        return convertToDto(path);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LearningPathDto> listUserPaths(String userId) {
        return learningPathRepository.findByUserIdAndStatus(userId, "ACTIVE").stream()
            .map(this::convertToDto)
            .toList();
    }

    @Override
    public void completeStep(String userId, String pathId, int stepOrder) {
        LearningPath path = findOwnedPath(userId, pathId);

        LearningPathStep step = path.getSteps().stream()
            .filter(candidate -> candidate.getStepOrder() == stepOrder)
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Step not found"));

        if (step.isCompleted()) {
            return;
        }
        step.setCompleted(true);

        long completed = path.getSteps().stream().filter(LearningPathStep::isCompleted).count();
        path.setCompletedSteps((int) completed);
        if (completed == path.getSteps().size()) {
            path.setStatus("COMPLETED");
            progressService.awardXp(userId, "LEARNING_PATH_COMPLETED", path.getId(), 40, "Completed learning path for " + path.getGoalSkill().getName() + ".");
        }

        learningPathRepository.save(path);
        progressService.awardXp(userId, "LEARNING_PATH_STEP", path.getId() + ":" + stepOrder, 10, "Completed " + step.getSkill().getName() + " in a learning path.");
    }

    @Override
    public void cancelPath(String userId, String pathId) {
        LearningPath path = findOwnedPath(userId, pathId);
        path.setStatus("CANCELLED");
        learningPathRepository.save(path);
    }

    private LearningPath findOwnedPath(String userId, String pathId) {
        LearningPath path = learningPathRepository.findById(pathId)
            .orElseThrow(() -> new IllegalArgumentException("Path not found"));
        if (!path.getUser().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("This learning path belongs to another user.");
        }
        return path;
    }

    private List<LearningPathDto.PathStepWithMentor> generatePathSteps(Skill goalSkill, User user, String targetLevel) {
        List<CatalogOption> catalogOptions = skillRepository.findAll().stream()
            .map(skill -> new CatalogOption(skill, countMentors(skill.getId(), user.getId())))
            .filter(option -> option.mentorCount() > 0)
            .limit(80)
            .toList();

        String currentSkills = user.getSkillsOffered() == null
            ? "none"
            : user.getSkillsOffered().stream().map(Skill::getName).reduce((a, b) -> a + ", " + b).orElse("none");
        String catalog = catalogOptions.stream()
            .map(option -> "%s|%s|%s|mentors=%d".formatted(
                option.skill().getId(),
                option.skill().getName(),
                option.skill().getCategory(),
                option.mentorCount()
            ))
            .reduce((a, b) -> a + "\n" + b)
            .orElse("none");

        String prompt = String.format("""
            You are SkillEX's AI path planner.

            Goal skill: "%s"
            Target level: "%s"
            User already teaches/knows: %s
            Available catalog skills with mentors, one per line:
            %s

            Generate a mentor-backed learning path.
            Rules:
            - Return ONLY valid JSON. No markdown.
            - Use 3 to 5 steps.
            - Choose ONLY skill ids from the provided catalog list.
            - Include the goal skill as the final or near-final step when it has mentors.
            - Do not include a skill already known unless it is essential as a deeper review.
            - Description must be practical, specific, and explain the learning outcome.

            JSON schema:
            {
              "steps": [
                {"skillId": "catalog-id", "description": "What to learn and why", "hours": 10}
              ]
            }
            """, goalSkill.getName(), targetLevel, currentSkills, catalog);

        List<LearningPathDto.PathStepWithMentor> steps = parseAiSteps(
            noteGenerationService.generateWithOllama(prompt),
            user.getId()
        );

        if (steps.isEmpty()) {
            User mentor = findBestMentorForSkill(goalSkill.getId(), user.getId());
            if (mentor != null) {
                steps.add(new LearningPathDto.PathStepWithMentor(
                    1,
                    goalSkill.getId(),
                    goalSkill.getName(),
                    "AI could not produce a full path, so start directly with a mentor-backed fundamentals session.",
                    20,
                    mentor.getId(),
                    mentor.getName(),
                    mentor.getAvatar(),
                    LocalDateTime.now().plusDays(7),
                    false
                ));
            }
        }

        return steps;
    }

    private List<LearningPathDto.PathStepWithMentor> parseAiSteps(String response, String userId) {
        List<LearningPathDto.PathStepWithMentor> steps = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(extractJsonObject(response));
            JsonNode stepNodes = root.path("steps");
            if (!stepNodes.isArray()) {
                return steps;
            }

            int order = 1;
            for (JsonNode node : stepNodes) {
                String skillId = node.path("skillId").asText("");
                Skill skill = skillId.isBlank()
                    ? skillRepository.findByNameIgnoreCase(firstText(node, "skillName", "name")).orElse(null)
                    : skillRepository.findById(skillId).orElse(null);
                if (skill == null) {
                    continue;
                }

                User mentor = findBestMentorForSkill(skill.getId(), userId);
                if (mentor == null) {
                    continue;
                }

                int hours = node.path("hours").asInt(node.path("estimatedHours").asInt(10));
                String description = firstText(node, "description", "reason", "rationale");
                steps.add(new LearningPathDto.PathStepWithMentor(
                    order++,
                    skill.getId(),
                    skill.getName(),
                    description.isBlank() ? "AI-selected step to build toward your goal skill." : description,
                    Math.max(3, Math.min(hours, 40)),
                    mentor.getId(),
                    mentor.getName(),
                    mentor.getAvatar(),
                    LocalDateTime.now().plusDays(order * 7L),
                    false
                ));
            }
        } catch (Exception ignored) {
            return steps;
        }
        return steps;
    }

    private int countMentors(String skillId, String excludeUserId) {
        try {
            return (int) userSkillOfferedRepository.findBySkillId(skillId).stream()
                .filter(offer -> !offer.getUser().getId().equals(excludeUserId))
                .count();
        } catch (Exception e) {
            return 0;
        }
    }

    private User findBestMentorForSkill(String skillId, String excludeUserId) {
        try {
            return userSkillOfferedRepository.findBySkillId(skillId).stream()
                .filter(offer -> !offer.getUser().getId().equals(excludeUserId))
                .map(UserSkillOffered::getUser)
                .min(Comparator.comparingInt(user -> -(user.getSessionsCompleted() != null ? user.getSessionsCompleted() : 0)))
                .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private LearningPathDto convertToDto(LearningPath path) {
        List<LearningPathDto.PathStepWithMentor> stepDtos = path.getSteps().stream()
            .map(step -> new LearningPathDto.PathStepWithMentor(
                step.getStepOrder(),
                step.getSkill().getId(),
                step.getSkill().getName(),
                step.getDescription(),
                step.getEstimatedHours(),
                step.getMentor().getId(),
                step.getMentor().getName(),
                step.getMentor().getAvatar(),
                step.getScheduledSessionAt(),
                step.isCompleted()
            ))
            .toList();

        return new LearningPathDto(
            path.getId(),
            path.getUser().getId(),
            path.getGoalSkill().getId(),
            path.getGoalSkill().getName(),
            path.getTargetLevel(),
            stepDtos,
            path.getTotalEstimatedHours(),
            path.getProgressPercent(),
            path.getCreatedAt(),
            path.getEstimatedCompletionAt(),
            path.getStatus()
        );
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

    private record CatalogOption(Skill skill, int mentorCount) {}
}
