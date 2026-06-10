package com.skillex.service.impl;

import com.skillex.dto.ai.LearningPathDto;
import com.skillex.model.*;
import com.skillex.repository.*;
import com.skillex.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class LearningPathServiceImpl implements LearningPathService {
    private final LearningPathRepository learningPathRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferRepository userSkillOfferRepository;
    private final NoteGenerationService noteGenerationService;
    private final SkillGapAnalyzerService skillGapAnalyzerService;

    @Override
    public LearningPathDto generateAndSchedulePath(String userId, String goalSkillId, String targetLevel) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Skill goalSkill = skillRepository.findById(goalSkillId)
            .orElseThrow(() -> new IllegalArgumentException("Goal skill not found"));

        // Generate path structure via AI
        List<LearningPathDto.PathStepWithMentor> pathSteps = generatePathSteps(goalSkill, user, targetLevel);

        // Create LearningPath entity
        LearningPath path = LearningPath.builder()
            .user(user)
            .goalSkill(goalSkill)
            .targetLevel(targetLevel)
            .totalEstimatedHours(pathSteps.stream().mapToInt(s -> s.estimatedHours()).sum())
            .estimatedCompletionAt(LocalDateTime.now().plusDays(pathSteps.size() * 7L))
            .status("ACTIVE")
            .build();

        // Create steps and assign mentors
        List<LearningPathStep> steps = new ArrayList<>();
        for (int i = 0; i < pathSteps.size(); i++) {
            LearningPathDto.PathStepWithMentor pathStep = pathSteps.get(i);
            Skill stepSkill = skillRepository.findById(pathStep.skillId())
                .orElseThrow();
            User mentor = userRepository.findById(pathStep.mentorId())
                .orElseThrow();

            LearningPathStep step = LearningPathStep.builder()
                .learningPath(path)
                .skill(stepSkill)
                .mentor(mentor)
                .stepOrder(i + 1)
                .estimatedHours(pathStep.estimatedHours())
                .description(pathStep.description())
                .scheduledSessionAt(LocalDateTime.now().plusDays((long) (i + 1) * 7))
                .build();

            steps.add(step);
        }

        path.setSteps(steps);
        path = learningPathRepository.save(path);

        return convertToDto(path);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LearningPathDto> listUserPaths(String userId) {
        List<LearningPath> paths = learningPathRepository.findByUserIdAndStatus(userId, "ACTIVE");
        return paths.stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    @Override
    public void completeStep(String pathId, int stepOrder) {
        LearningPath path = learningPathRepository.findById(pathId)
            .orElseThrow(() -> new IllegalArgumentException("Path not found"));

        LearningPathStep step = path.getSteps().stream()
            .filter(s -> s.getStepOrder() == stepOrder)
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Step not found"));

        step.setCompleted(true);
        path.setCompletedSteps(path.getCompletedSteps() + 1);

        if (path.getCompletedSteps() == path.getSteps().size()) {
            path.setStatus("COMPLETED");
        }

        learningPathRepository.save(path);
    }

    @Override
    public void cancelPath(String pathId) {
        LearningPath path = learningPathRepository.findById(pathId)
            .orElseThrow(() -> new IllegalArgumentException("Path not found"));
        path.setStatus("CANCELLED");
        learningPathRepository.save(path);
    }

    private List<LearningPathDto.PathStepWithMentor> generatePathSteps(Skill goalSkill, User user, String targetLevel) {
        String prompt = String.format("""
            Generate a detailed, ordered learning path to master "%s" at "%s" level.
            Current user skills: %s

            Create 3-5 specific steps with:
            1. Skill name
            2. Why it's needed (reason)
            3. Estimated hours (5-20)

            Format as JSON:
            {
              "steps": [
                {"name": "Skill", "reason": "...", "hours": 10}
              ]
            }
            """,
            goalSkill.getName(),
            targetLevel,
            user.getSkillsOffered().stream().map(Skill::getName).collect(Collectors.joining(", "))
        );

        String response = noteGenerationService.generateWithOllama(prompt);

        // Parse response and find mentors for each step
        List<LearningPathDto.PathStepWithMentor> steps = new ArrayList<>();

        // Simplified parsing (production would use Jackson)
        String[] lines = response.split("\n");
        int stepNum = 1;

        for (String line : lines) {
            if (line.contains("\"name\"")) {
                String skillName = extractJsonString(line, "name");
                String reason = extractJsonString(line, "reason");
                int hours = extractJsonInt(line, "hours");

                if (!skillName.isEmpty()) {
                    Skill stepSkill = skillRepository.findByNameIgnoreCase(skillName)
                        .orElseGet(() -> Skill.builder()
                            .name(skillName)
                            .category(goalSkill.getCategory())
                            .icon("📚")
                            .build());

                    // Find best mentor for this step
                    User mentor = findBestMentorForSkill(stepSkill.getId(), user.getId());

                    if (mentor != null) {
                        steps.add(new LearningPathDto.PathStepWithMentor(
                            stepNum++,
                            stepSkill.getId(),
                            skillName,
                            reason.isEmpty() ? "Master this skill" : reason,
                            hours == 0 ? 10 : hours,
                            mentor.getId(),
                            mentor.getName(),
                            mentor.getAvatar(),
                            LocalDateTime.now().plusDays(stepNum * 7L),
                            false
                        ));
                    }
                }
            }
        }

        // Ensure at least one step
        if (steps.isEmpty()) {
            User mentor = findBestMentorForSkill(goalSkill.getId(), user.getId());
            if (mentor != null) {
                steps.add(new LearningPathDto.PathStepWithMentor(
                    1,
                    goalSkill.getId(),
                    goalSkill.getName(),
                    "Master the fundamentals and advanced techniques",
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

    private User findBestMentorForSkill(String skillId, String excludeUserId) {
        try {
            return userSkillOfferRepository.findBySkillId(skillId).stream()
                .filter(o -> !o.getUser().getId().equals(excludeUserId))
                .map(UserSkillOffer::getUser)
                .min(Comparator.comparingInt(u -> -(u.getSessionsCompleted() != null ? u.getSessionsCompleted() : 0)))
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
            .collect(Collectors.toList());

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

    private String extractJsonString(String line, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(line);
        return m.find() ? m.group(1) : "";
    }

    private int extractJsonInt(String line, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*(\\d+)";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(line);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }
}
