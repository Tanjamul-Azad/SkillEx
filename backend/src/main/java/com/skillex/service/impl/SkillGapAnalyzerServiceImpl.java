package com.skillex.service.impl;

import com.skillex.dto.ai.SkillGapAnalysisDto;
import com.skillex.dto.ai.SkillGapDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.model.UserSkillOffer;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.UserSkillOfferRepository;
import com.skillex.service.SkillGapAnalyzerService;
import com.skillex.service.SkillIntentService;
import com.skillex.service.SkillSimilarityService;
import com.skillex.service.NoteGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillGapAnalyzerServiceImpl implements SkillGapAnalyzerService {
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillOfferRepository userSkillOfferRepository;
    private final SkillSimilarityService similarityService;
    private final NoteGenerationService noteGenerationService;

    @Override
    public SkillGapAnalysisDto analyzeGap(String userId, String goalSkillId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Skill goalSkill = skillRepository.findById(goalSkillId)
            .orElseThrow(() -> new IllegalArgumentException("Goal skill not found"));

        // Get user's current skills
        List<Skill> currentSkills = user.getSkillsOffered() != null
            ? user.getSkillsOffered()
            : new ArrayList<>();
        List<String> currentSkillNames = currentSkills.stream()
            .map(Skill::getName)
            .collect(Collectors.toList());

        // Generate learning path via AI
        LearningPath path = generatePath(goalSkill.getName(), currentSkillNames);

        // Find gaps: skills in path but not in current skills
        Set<String> currentSet = currentSkills.stream()
            .map(s -> s.getName().toLowerCase())
            .collect(Collectors.toSet());

        List<SkillGapDto> gaps = path.steps.stream()
            .filter(step -> !currentSet.contains(step.skillName.toLowerCase()))
            .map(step -> buildGapDto(step.skillName, step.rationale))
            .collect(Collectors.toList());

        String summary = String.format(
            "To master %s, you need %d more skills. Start with %s.",
            goalSkill.getName(),
            gaps.size(),
            gaps.isEmpty() ? "practice!" : gaps.get(0).skillName()
        );

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
    public SkillGapAnalysisDto.LearningPath generatePath(String goalSkillName, List<String> currentSkillNames) {
        String prompt = String.format("""
            The user wants to master "%s".
            They already know: %s

            Generate a SHORT, ordered learning path (2-4 skills max) from their current level to mastery.
            Each step should build on the previous one.
            Focus on practical prerequisites.

            Format exactly as JSON:
            {
              "steps": [
                {"order": 1, "skill": "Skill Name", "hours": 10, "reason": "Foundation for..."},
                {"order": 2, "skill": "Skill Name", "hours": 15, "reason": "Builds on..."}
              ],
              "totalHours": 25,
              "summary": "Brief explanation"
            }
            """, goalSkillName, currentSkillNames.isEmpty() ? "nothing yet" : String.join(", ", currentSkillNames));

        String response = noteGenerationService.generateWithOllama(prompt);

        // Parse JSON response
        return parsePathJson(response, goalSkillName);
    }

    private SkillGapAnalysisDto.LearningPath parsePathJson(String jsonResponse, String goalSkill) {
        try {
            // Extract JSON from response (handle markdown code blocks)
            String json = jsonResponse;
            if (json.contains("```json")) {
                json = json.substring(json.indexOf("```json") + 7);
                json = json.substring(0, json.indexOf("```"));
            } else if (json.contains("```")) {
                json = json.substring(json.indexOf("```") + 3);
                json = json.substring(0, json.indexOf("```"));
            }

            // Simple JSON parsing (for production, use Jackson)
            List<SkillGapAnalysisDto.PathStep> steps = new ArrayList<>();
            int order = 1;

            // Extract step names and hours from response
            String[] lines = json.split("\n");
            for (String line : lines) {
                if (line.contains("\"skill\"") || line.contains("\"order\"")) {
                    // Naive parsing - in production use Jackson ObjectMapper
                    String skill = extractJsonString(line, "skill");
                    int hours = extractJsonInt(line, "hours");
                    String reason = extractJsonString(line, "reason");

                    if (!skill.isEmpty()) {
                        // Find or create skill
                        Skill skillEntity = skillRepository.findByNameIgnoreCase(skill)
                            .orElseGet(() -> Skill.builder()
                                .name(skill)
                                .category("Learning Path")
                                .icon("📚")
                                .build());

                        steps.add(new SkillGapAnalysisDto.PathStep(
                            order++,
                            skill,
                            skillEntity.getId(),
                            reason.isEmpty() ? "Essential prerequisite" : reason,
                            hours,
                            findMentorsForSkill(skillEntity.getId(), 3)
                        ));
                    }
                }
            }

            if (steps.isEmpty()) {
                // Fallback if parsing failed
                steps.add(new SkillGapAnalysisDto.PathStep(
                    1,
                    "Foundational Concepts",
                    UUID.randomUUID().toString(),
                    "Master the fundamentals",
                    10,
                    new ArrayList<>()
                ));
            }

            int totalHours = steps.stream().mapToInt(SkillGapAnalysisDto.PathStep::estimatedHours).sum();

            return new SkillGapAnalysisDto.LearningPath(
                steps,
                Math.max(totalHours, 20),
                "Personalized learning path generated by AI"
            );
        } catch (Exception e) {
            // Fallback path
            return new SkillGapAnalysisDto.LearningPath(
                List.of(
                    new SkillGapAnalysisDto.PathStep(1, "Fundamentals", UUID.randomUUID().toString(), "Start here", 10, new ArrayList<>())
                ),
                20,
                "Default path (AI generation encountered an issue)"
            );
        }
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

    private SkillGapDto buildGapDto(String skillName, String reason) {
        Skill skill = skillRepository.findByNameIgnoreCase(skillName)
            .orElseGet(() -> Skill.builder()
                .name(skillName)
                .category("Learning Path")
                .icon("📚")
                .build());

        List<String> mentorNames = findMentorNamesForSkill(skill.getId());

        return new SkillGapDto(
            skill.getId(),
            skillName,
            skill.getCategory(),
            0.75, // placeholder similarity
            reason,
            mentorNames,
            mentorNames.size()
        );
    }

    private List<SkillGapAnalysisDto.MentorMatch> findMentorsForSkill(String skillId, int limit) {
        try {
            List<UserSkillOffer> offers = userSkillOfferRepository.findBySkillId(skillId);

            return offers.stream()
                .limit(limit)
                .map(offer -> {
                    User mentor = offer.getUser();
                    int sessions = mentor.getSessionsCompleted() != null ? mentor.getSessionsCompleted() : 0;
                    double rating = mentor.getRating() != null ? mentor.getRating() : 0.0;

                    return new SkillGapAnalysisDto.MentorMatch(
                        mentor.getId(),
                        mentor.getName(),
                        mentor.getAvatar(),
                        sessions >= 3 && rating >= 4.0 ? 75.0 : 50.0,
                        sessions,
                        rating,
                        String.format("%d sessions, %.1f★", sessions, rating)
                    );
                })
                .collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<String> findMentorNamesForSkill(String skillId) {
        try {
            return userSkillOfferRepository.findBySkillId(skillId).stream()
                .limit(3)
                .map(o -> o.getUser().getName())
                .collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private static class LearningPath extends SkillGapAnalysisDto.LearningPath {
        LearningPath(List<SkillGapAnalysisDto.PathStep> steps, int hours, String reasoning) {
            super(steps, hours, reasoning);
        }
    }
}
