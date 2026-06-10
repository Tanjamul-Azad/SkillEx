package com.skillex.service.impl;

import com.skillex.dto.ai.SkillAssessmentDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.SkillAssessmentService;
import com.skillex.service.NoteGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class SkillAssessmentServiceImpl implements SkillAssessmentService {
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final NoteGenerationService noteGenerationService;

    @Override
    public SkillAssessmentDto generateAssessment(String userId, String skillId, String difficulty) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Skill skill = skillRepository.findById(skillId)
            .orElseThrow(() -> new IllegalArgumentException("Skill not found"));

        // Generate quiz questions via Ollama
        List<SkillAssessmentDto.QuizQuestion> questions = generateQuestions(skill.getName(), difficulty);

        return new SkillAssessmentDto(
            UUID.randomUUID().toString(),
            skillId,
            skill.getName(),
            difficulty,
            questions,
            30 // 30 minutes time limit
        );
    }

    @Override
    public SkillAssessmentDto.GradedAssessment submitAnswers(String assessmentId, Map<String, String> answers) {
        // In production, load assessment from DB
        // For now, grade the answers with Ollama

        int correctCount = 0;
        int totalCount = answers.size();

        for (Map.Entry<String, String> entry : answers.entrySet()) {
            String questionId = entry.getKey();
            String userAnswer = entry.getValue();

            // Grade with Ollama
            boolean isCorrect = gradeAnswer(questionId, userAnswer);
            if (isCorrect) correctCount++;
        }

        int score = totalCount == 0 ? 0 : (correctCount * 100) / totalCount;
        String proficiencyLevel = getProficiencyLevel(score);
        boolean passed = score >= 70;

        return new SkillAssessmentDto.GradedAssessment(
            assessmentId,
            "", // skillId not returned in this DTO
            "", // skillName
            score,
            correctCount,
            totalCount,
            proficiencyLevel,
            generateFeedback(score, correctCount, totalCount),
            LocalDateTime.now(),
            passed
        );
    }

    @Override
    public SkillAssessmentDto.GradedAssessment getLatestResult(String userId, String skillId) {
        // In production, query from DB
        // For now, return null
        return null;
    }

    private List<SkillAssessmentDto.QuizQuestion> generateQuestions(String skillName, String difficulty) {
        String prompt = String.format("""
            Generate 5 assessment questions for "%s" at "%s" level.
            Include mix of:
            - 2-3 multiple choice (4 options each)
            - 2 free-text short answers

            Format as JSON:
            {
              "questions": [
                {"id": "q1", "question": "...", "type": "multiple_choice", "options": ["a", "b", "c", "d"]},
                {"id": "q2", "question": "...", "type": "free_text"}
              ]
            }
            """, skillName, difficulty);

        String response = noteGenerationService.generateWithOllama(prompt);

        // Parse and build questions
        List<SkillAssessmentDto.QuizQuestion> questions = new ArrayList<>();

        // Simplified parsing (production would use Jackson)
        String[] lines = response.split("\n");
        String currentQuestion = "";
        String currentType = "";
        List<String> currentOptions = new ArrayList<>();

        for (int i = 0; i < Math.min(5, 20); i++) { // Up to 5 questions from 20 lines of response
            String qId = "q" + (i + 1);
            String q = extractJsonString(lines, "question");
            String type = extractJsonString(lines, "type");

            if (!q.isEmpty()) {
                List<String> options = new ArrayList<>();
                if ("multiple_choice".equals(type)) {
                    options = List.of("Option A", "Option B", "Option C", "Option D");
                }

                questions.add(new SkillAssessmentDto.QuizQuestion(
                    qId,
                    q,
                    type.isEmpty() ? "free_text" : type,
                    options,
                    "answer" // placeholder, shown only after completion
                ));
            }
        }

        // Fallback if parsing failed
        if (questions.isEmpty()) {
            questions.add(new SkillAssessmentDto.QuizQuestion(
                "q1",
                "What are the key principles of " + skillName + "?",
                "free_text",
                new ArrayList<>(),
                ""
            ));
            questions.add(new SkillAssessmentDto.QuizQuestion(
                "q2",
                "Describe a real-world application of " + skillName,
                "free_text",
                new ArrayList<>(),
                ""
            ));
        }

        return questions;
    }

    private boolean gradeAnswer(String questionId, String userAnswer) {
        String prompt = String.format("""
            Grade this answer:
            Question ID: %s
            User's answer: "%s"

            Is this correct, complete, and demonstrates understanding?
            Reply only "YES" or "NO".
            """, questionId, userAnswer);

        String response = noteGenerationService.generateWithOllama(prompt).trim().toUpperCase();
        return response.contains("YES");
    }

    private String getProficiencyLevel(int score) {
        if (score >= 90) return "expert";
        if (score >= 75) return "proficient";
        if (score >= 60) return "intermediate";
        return "novice";
    }

    private String generateFeedback(int score, int correct, int total) {
        String prompt = String.format("""
            Create brief, encouraging feedback for a skill assessment result:
            - Score: %d%%
            - Got %d out of %d questions correct

            2-3 sentences highlighting strengths and one area to practice.
            """, score, correct, total);

        return noteGenerationService.generateWithOllama(prompt);
    }

    private String extractJsonString(String[] lines, String key) {
        for (String line : lines) {
            String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
            java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(line);
            if (m.find()) {
                return m.group(1);
            }
        }
        return "";
    }
}
