package com.skillex.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.ai.SkillAssessmentDto;
import com.skillex.model.AssessmentResponse;
import com.skillex.model.Skill;
import com.skillex.model.SkillAssessment;
import com.skillex.model.SkillCertificate;
import com.skillex.model.User;
import com.skillex.repository.AssessmentResponseRepository;
import com.skillex.repository.SkillAssessmentRepository;
import com.skillex.repository.SkillCertificateRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.NoteGenerationService;
import com.skillex.service.NotificationService;
import com.skillex.service.ProgressService;
import com.skillex.service.SkillAssessmentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SkillAssessmentServiceImpl implements SkillAssessmentService {
    private static final int PASS_THRESHOLD = 70;

    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final SkillAssessmentRepository assessmentRepository;
    private final AssessmentResponseRepository responseRepository;
    private final SkillCertificateRepository certificateRepository;
    private final NoteGenerationService noteGenerationService;
    private final NotificationService notificationService;
    private final ProgressService progressService;
    private final ObjectMapper objectMapper;

    @Override
    public SkillAssessmentDto generateAssessment(String userId, String skillId, String difficulty) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Skill skill = skillRepository.findById(skillId)
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + skillId));

        String safeDifficulty = switch (difficulty == null ? "" : difficulty.toLowerCase()) {
            case "beginner", "advanced" -> difficulty.toLowerCase();
            default -> "intermediate";
        };

        List<SkillAssessmentDto.QuizQuestion> questions = generateQuestions(skill.getName(), safeDifficulty);

        SkillAssessment assessment = SkillAssessment.builder()
            .user(user)
            .skill(skill)
            .difficulty(safeDifficulty)
            .status("IN_PROGRESS")
            .questions(writeQuestionsJson(questions))
            .build();
        assessment = assessmentRepository.save(assessment);

        // Strip correct answers before the quiz leaves the server.
        List<SkillAssessmentDto.QuizQuestion> sanitized = questions.stream()
            .map(q -> new SkillAssessmentDto.QuizQuestion(
                q.questionId(), q.question(), q.type(), q.options(), null))
            .toList();

        return new SkillAssessmentDto(
            assessment.getId(),
            skillId,
            skill.getName(),
            safeDifficulty,
            sanitized,
            30
        );
    }

    @Override
    public SkillAssessmentDto.GradedAssessment submitAnswers(String userId, String assessmentId, Map<String, String> answers) {
        SkillAssessment assessment = assessmentRepository.findById(assessmentId)
            .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));

        if (!assessment.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("This assessment belongs to another user.");
        }
        if (!"IN_PROGRESS".equals(assessment.getStatus())) {
            throw new IllegalArgumentException("This assessment was already submitted.");
        }

        List<SkillAssessmentDto.QuizQuestion> questions = readQuestionsJson(assessment.getQuestions());
        Skill skill = assessment.getSkill();

        int correctCount = 0;
        List<AssessmentResponse> responses = new ArrayList<>();

        for (SkillAssessmentDto.QuizQuestion question : questions) {
            String userAnswer = answers.getOrDefault(question.questionId(), "");
            boolean correct = !userAnswer.isBlank() && gradeAnswer(skill.getName(), question, userAnswer);
            if (correct) correctCount++;

            responses.add(AssessmentResponse.builder()
                .assessment(assessment)
                .questionId(question.questionId())
                .userAnswer(userAnswer)
                .isCorrect(correct)
                .build());
        }
        responseRepository.saveAll(responses);

        int total = questions.size();
        int score = total == 0 ? 0 : (correctCount * 100) / total;
        String proficiencyLevel = getProficiencyLevel(score);
        boolean passed = score >= PASS_THRESHOLD;
        String feedback = generateFeedback(skill.getName(), score, correctCount, total);

        assessment.setStatus("COMPLETED");
        assessment.setScore(score);
        assessment.setProficiencyLevel(proficiencyLevel);
        assessment.setFeedback(feedback);
        assessment.setCompletedAt(LocalDateTime.now());
        assessmentRepository.save(assessment);

        if (passed) {
            issueCertificateIfMissing(assessment.getUser(), skill, score, proficiencyLevel);
            progressService.awardXp(userId, "ASSESSMENT_PASSED", assessment.getId(), 30, "Passed the " + skill.getName() + " skill assessment.");
        } else {
            progressService.awardXp(userId, "ASSESSMENT_ATTEMPTED", assessment.getId(), 8, "Completed the " + skill.getName() + " skill assessment.");
        }

        return new SkillAssessmentDto.GradedAssessment(
            assessment.getId(),
            skill.getId(),
            skill.getName(),
            score,
            correctCount,
            total,
            proficiencyLevel,
            feedback,
            assessment.getCompletedAt(),
            passed
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SkillAssessmentDto.GradedAssessment getLatestResult(String userId, String skillId) {
        return assessmentRepository
            .findFirstByUserIdAndSkillIdAndStatusOrderByCompletedAtDesc(userId, skillId, "COMPLETED")
            .map(a -> new SkillAssessmentDto.GradedAssessment(
                a.getId(),
                a.getSkill().getId(),
                a.getSkill().getName(),
                a.getScore() == null ? 0 : a.getScore(),
                0,
                0,
                a.getProficiencyLevel(),
                a.getFeedback(),
                a.getCompletedAt(),
                a.getScore() != null && a.getScore() >= PASS_THRESHOLD
            ))
            .orElse(null);
    }

    // Question generation

    private List<SkillAssessmentDto.QuizQuestion> generateQuestions(String skillName, String difficulty) {
        String prompt = String.format("""
            Generate exactly 5 assessment questions for the skill "%s" at "%s" level.
            Mix: 3 multiple choice (exactly 4 options each) and 2 free-text short answers.
            Questions must test real-world application, not trivia.

            Respond with ONLY this JSON, no other text:
            {
              "questions": [
                {"id": "q1", "question": "...", "type": "multiple_choice", "options": ["...", "...", "...", "..."], "correctAnswer": "..."},
                {"id": "q4", "question": "...", "type": "free_text"}
              ]
            }
            For multiple_choice, correctAnswer must exactly match one of the options.
            """, skillName, difficulty);

        String response = noteGenerationService.generateWithOllama(prompt);
        List<SkillAssessmentDto.QuizQuestion> questions = parseQuestions(response);

        if (questions.isEmpty()) {
            log.warn("[Assessment] AI question generation failed for '{}' — using fallback set.", skillName);
            questions = fallbackQuestions(skillName);
        }
        return questions;
    }

    private List<SkillAssessmentDto.QuizQuestion> parseQuestions(String response) {
        List<SkillAssessmentDto.QuizQuestion> questions = new ArrayList<>();
        if (response == null || response.isBlank()) return questions;

        try {
            String json = extractJsonBlock(response);
            JsonNode root = objectMapper.readTree(json);
            JsonNode items = root.path("questions");
            if (!items.isArray()) return questions;

            int index = 1;
            for (JsonNode item : items) {
                String text = item.path("question").asText("");
                if (text.isBlank()) continue;

                String type = item.path("type").asText("free_text");
                List<String> options = new ArrayList<>();
                if (item.path("options").isArray()) {
                    item.path("options").forEach(o -> options.add(o.asText()));
                }
                // A multiple-choice question without usable options degrades to free text.
                if ("multiple_choice".equals(type) && options.size() < 2) {
                    type = "free_text";
                    options.clear();
                }
                String correctAnswer = item.path("correctAnswer").asText("");

                questions.add(new SkillAssessmentDto.QuizQuestion(
                    "q" + index++,
                    text,
                    type,
                    options,
                    correctAnswer.isBlank() ? null : correctAnswer
                ));
                if (questions.size() == 5) break;
            }
        } catch (Exception e) {
            log.warn("[Assessment] Could not parse AI question JSON: {}", e.getMessage());
        }
        return questions;
    }

    private List<SkillAssessmentDto.QuizQuestion> fallbackQuestions(String skillName) {
        return List.of(
            new SkillAssessmentDto.QuizQuestion("q1",
                "Explain the core principles of " + skillName + " in your own words.",
                "free_text", List.of(), null),
            new SkillAssessmentDto.QuizQuestion("q2",
                "Describe a real project where you applied " + skillName + ". What was your approach?",
                "free_text", List.of(), null),
            new SkillAssessmentDto.QuizQuestion("q3",
                "What is the most common beginner mistake in " + skillName + ", and how do you avoid it?",
                "free_text", List.of(), null)
        );
    }

    // Grading

    private boolean gradeAnswer(String skillName, SkillAssessmentDto.QuizQuestion question, String userAnswer) {
        // Multiple choice with a known key grades deterministically.
        if ("multiple_choice".equals(question.type())
            && question.correctAnswer() != null && !question.correctAnswer().isBlank()) {
            return question.correctAnswer().trim().equalsIgnoreCase(userAnswer.trim());
        }

        String prompt = String.format("""
            You are grading one answer in a %s skill assessment.

            Question: %s
            Student's answer: "%s"

            Is the answer substantially correct and does it demonstrate real understanding?
            Reply with only YES or NO.
            """, skillName, question.question(), userAnswer);

        String response = noteGenerationService.generateWithOllama(prompt).trim().toUpperCase();
        if (response.isBlank()) {
            // Model unavailable — give credit for a substantive attempt rather than failing everyone.
            return userAnswer.trim().length() >= 30;
        }
        return response.startsWith("YES") || response.contains(" YES");
    }

    private String getProficiencyLevel(int score) {
        if (score >= 90) return "expert";
        if (score >= 75) return "proficient";
        if (score >= 60) return "intermediate";
        return "novice";
    }

    private String generateFeedback(String skillName, int score, int correct, int total) {
        String prompt = String.format("""
            Write brief, encouraging feedback (2-3 sentences) for a %s assessment result:
            score %d%%, %d of %d questions correct. Mention one thing to practice next.
            Plain text only.
            """, skillName, score, correct, total);

        String feedback = noteGenerationService.generateWithOllama(prompt);
        if (feedback == null || feedback.isBlank()) {
            return String.format("You scored %d%% (%d of %d correct). %s", score, correct, total,
                score >= PASS_THRESHOLD
                    ? "Solid work — keep building on it with real projects."
                    : "Review the fundamentals and try again — you're close.");
        }
        return feedback.trim();
    }

    // Certificate

    private void issueCertificateIfMissing(User user, Skill skill, int score, String proficiencyLevel) {
        boolean exists = certificateRepository
            .findByUserIdAndSkillIdAndCertificateType(
                user.getId(), skill.getId(), SkillCertificate.CertificateType.SKILL_LEARNER)
            .isPresent();
        if (exists) return;

        SkillCertificate certificate = SkillCertificate.builder()
            .user(user)
            .skill(skill)
            .certificateType(SkillCertificate.CertificateType.SKILL_LEARNER)
            .title("Verified Proficiency in " + skill.getName())
            .levelLabel(capitalize(proficiencyLevel))
            .trustScoreSnapshot(score)
            .sessionCountSnapshot(0)
            .averageRatingSnapshot(BigDecimal.ZERO.setScale(2))
            .verificationCode("SKX-ASSESS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .status(SkillCertificate.CertificateStatus.ACTIVE)
            .issuedAt(LocalDateTime.now())
            .build();
        certificate = certificateRepository.save(certificate);

        notificationService.create(
            user.getId(),
            null,
            "SYSTEM_UPDATE",
            "You passed the " + skill.getName() + " assessment and earned a certificate.",
            "CERTIFICATE",
            certificate.getId(),
            "/certificates?certificateId=" + certificate.getId()
        );
    }

    // JSON helpers

    private String writeQuestionsJson(List<SkillAssessmentDto.QuizQuestion> questions) {
        try {
            return objectMapper.writeValueAsString(questions);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialize assessment questions", e);
        }
    }

    private List<SkillAssessmentDto.QuizQuestion> readQuestionsJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<SkillAssessmentDto.QuizQuestion>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Could not read stored assessment questions", e);
        }
    }

    private String extractJsonBlock(String response) {
        String json = response;
        if (json.contains("```json")) {
            json = json.substring(json.indexOf("```json") + 7);
            json = json.substring(0, json.indexOf("```"));
        } else if (json.contains("```")) {
            json = json.substring(json.indexOf("```") + 3);
            json = json.substring(0, json.indexOf("```"));
        }
        int start = json.indexOf('{');
        int end = json.lastIndexOf('}');
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }
        return json.trim();
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) return "Verified";
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }
}
