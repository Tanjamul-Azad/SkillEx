package com.skillex.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skillex.dto.ai.TutorConversationDto;
import com.skillex.dto.ai.TutorMessageDto;
import com.skillex.dto.ai.TutorMessageMetadata;
import com.skillex.model.*;
import com.skillex.repository.*;
import com.skillex.service.TutorBotService;
import com.skillex.service.ai.AiProvider;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TutorBotServiceImpl implements TutorBotService {

    private final TutorBotConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final SessionNoteRepository sessionNoteRepository;
    private final AiProvider aiProvider;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int MAX_CONTEXT_NOTES = 3;

    @Override
    @Transactional
    public TutorMessageDto sendMessage(String userId, String skillId, String messageContent) {
        log.info("[TutorBot] Sending message for user {} to skill {}", userId, skillId);

        // Validate user and skill exist
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        Skill skill = skillRepository.findById(skillId)
            .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + skillId));

        // Get or create conversation
        TutorBotConversation conversation = conversationRepository.findByUserIdAndSkillId(userId, skillId)
            .orElseGet(() -> createNewConversation(user, skill));

        // Load current message history
        List<TutorMessageDto> messages = loadMessageHistory(conversation);

        // Add user message
        String userMessageId = UUID.randomUUID().toString();
        TutorMessageDto userMessage = new TutorMessageDto(
            userMessageId,
            messageContent,
            "user",
            LocalDateTime.now().format(ISO_FORMATTER),
            null
        );
        messages.add(userMessage);

        // Load recent session notes for context
        String sessionContext = loadSessionNotesContext(user, skill);

        // Build prompt for AI
        String prompt = buildTutorPrompt(skill, messages, sessionContext);

        // Generate tutor response
        String tutorResponse = aiProvider.generateText("tutor-bot", prompt,
            "I'm here to help you learn " + skill.getName() + "! What would you like to know?");

        // Every few exchanges, swap the reply for a real quiz question.
        // Quiz stats are recorded when the learner answers, not when we ask.
        TutorMessageMetadata metadata = null;
        String tutorContent = tutorResponse;
        if (shouldAskQuiz(messages)) {
            GeneratedQuiz quiz = generateQuiz(skill, messages);
            if (quiz != null) {
                metadata = new TutorMessageMetadata(
                    true,
                    "multiple-choice",
                    quiz.options(),
                    quiz.correctIndex(),
                    false,
                    null,
                    quiz.explanation(),
                    List.of(),
                    skill.getName(),
                    List.of("Explain this concept", "Give me an example", "Ask another question")
                );
                tutorContent = quiz.question();
            }
        }

        // Add tutor response
        String tutorMessageId = UUID.randomUUID().toString();
        TutorMessageDto tutorMessage = new TutorMessageDto(
            tutorMessageId,
            tutorContent,
            "tutor",
            LocalDateTime.now().format(ISO_FORMATTER),
            metadata
        );
        messages.add(tutorMessage);

        // Save conversation
        conversation.setMessagesJson(serializeMessages(messages));
        conversation.setLastInteractionAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return tutorMessage;
    }

    @Override
    @Transactional(readOnly = true)
    public TutorConversationDto getConversation(String userId, String skillId) {
        TutorBotConversation conversation = conversationRepository.findByUserIdAndSkillId(userId, skillId)
            .orElseThrow(() -> new EntityNotFoundException("Conversation not found for user " + userId + " and skill " + skillId));

        return mapToDto(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TutorConversationDto> getUserConversations(String userId) {
        userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        return conversationRepository.findByUserIdOrderByLastInteractionAtDesc(userId)
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteConversation(String userId, String skillId) {
        conversationRepository.deleteByUserIdAndSkillId(userId, skillId);
        log.info("[TutorBot] Deleted conversation for user {} and skill {}", userId, skillId);
    }

    @Override
    @Transactional
    public void clearConversationMessages(String userId, String skillId) {
        TutorBotConversation conversation = conversationRepository.findByUserIdAndSkillId(userId, skillId)
            .orElseThrow(() -> new EntityNotFoundException("Conversation not found for user " + userId + " and skill " + skillId));

        conversation.setMessagesJson(serializeMessages(new ArrayList<>()));
        conversationRepository.save(conversation);
        log.info("[TutorBot] Cleared messages for user {} and skill {}", userId, skillId);
    }

    @Override
    @Transactional
    public TutorMessageDto submitQuizAnswer(String userId, String skillId, String messageId, Integer answerIndex, String answerText) {
        TutorBotConversation conversation = conversationRepository.findByUserIdAndSkillId(userId, skillId)
            .orElseThrow(() -> new EntityNotFoundException("Conversation not found for user " + userId + " and skill " + skillId));

        List<TutorMessageDto> messages = loadMessageHistory(conversation);

        // Find the quiz question
        TutorMessageDto quizMessage = messages.stream()
            .filter(m -> messageId.equals(m.id()) && "tutor".equals(m.role()) && m.metadata() != null && Boolean.TRUE.equals(m.metadata().isQuiz()))
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("Quiz question not found: " + messageId));

        // Check if answer is correct
        boolean isCorrect = false;
        String feedback;

        if (quizMessage.metadata() != null && "multiple-choice".equals(quizMessage.metadata().quizType())) {
            isCorrect = answerIndex != null && answerIndex.equals(quizMessage.metadata().correctAnswerIndex());
            if (isCorrect) {
                feedback = "Excellent! You got it right. " + quizMessage.metadata().answerFeedback();
                conversation.recordQuizAttempt(true);
            } else {
                String selectedOption = answerIndex != null && quizMessage.metadata().quizOptions() != null
                    && answerIndex < quizMessage.metadata().quizOptions().size()
                    ? quizMessage.metadata().quizOptions().get(answerIndex)
                    : "your selection";
                String correctOption = quizMessage.metadata().quizOptions() != null
                    && quizMessage.metadata().correctAnswerIndex() < quizMessage.metadata().quizOptions().size()
                    ? quizMessage.metadata().quizOptions().get(quizMessage.metadata().correctAnswerIndex())
                    : "the correct answer";
                feedback = "Not quite. You selected: " + selectedOption + ". The correct answer is: " + correctOption + ". "
                    + quizMessage.metadata().answerFeedback();
                conversation.recordQuizAttempt(false);
            }
        } else {
            // Short answer - use AI to evaluate
            String evaluationPrompt = "Grade this short answer to the quiz question: \"" + quizMessage.content() + "\"\n"
                + "User's answer: \"" + answerText + "\"\n"
                + "Provide feedback and indicate if the answer is correct (start with YES or NO).";
            String evaluation = aiProvider.generateText("quiz-evaluation", evaluationPrompt, "The answer seems reasonable.");
            isCorrect = evaluation.toUpperCase().startsWith("YES");
            feedback = evaluation;
            conversation.recordQuizAttempt(isCorrect);
        }

        // Add answer message
        String answerMessageId = UUID.randomUUID().toString();
        TutorMessageDto answerMessage = new TutorMessageDto(
            answerMessageId,
            answerText != null ? answerText : ("Answer: Option " + (answerIndex != null ? answerIndex + 1 : "unknown")),
            "user",
            LocalDateTime.now().format(ISO_FORMATTER),
            null
        );
        messages.add(answerMessage);

        // Add feedback message
        String feedbackMessageId = UUID.randomUUID().toString();
        TutorMessageDto feedbackMessage = new TutorMessageDto(
            feedbackMessageId,
            feedback,
            "tutor",
            LocalDateTime.now().format(ISO_FORMATTER),
            null
        );
        messages.add(feedbackMessage);

        // Save updated conversation
        conversation.setMessagesJson(serializeMessages(messages));
        conversation.setLastInteractionAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return feedbackMessage;
    }

    // Private helper methods

    private TutorBotConversation createNewConversation(User user, Skill skill) {
        TutorBotConversation conversation = TutorBotConversation.builder()
            .user(user)
            .skill(skill)
            .messagesJson(serializeMessages(new ArrayList<>()))
            .active(true)
            .build();
        return conversationRepository.save(conversation);
    }

    private List<TutorMessageDto> loadMessageHistory(TutorBotConversation conversation) {
        try {
            String json = conversation.getMessagesJson();
            if (json == null || json.isBlank()) {
                return new ArrayList<>();
            }
            return objectMapper.readValue(json, new TypeReference<List<TutorMessageDto>>() {});
        } catch (Exception e) {
            log.error("[TutorBot] Error deserializing messages", e);
            return new ArrayList<>();
        }
    }

    private String serializeMessages(List<TutorMessageDto> messages) {
        try {
            return objectMapper.writeValueAsString(messages);
        } catch (Exception e) {
            log.error("[TutorBot] Error serializing messages", e);
            return "[]";
        }
    }

    private String loadSessionNotesContext(User user, Skill skill) {
        // Load recent session notes for the skill
        // In a real implementation, you'd query SessionNote by user and skill
        // For now, we'll provide a simple template
        return String.format(
            "The learner is working on improving their %s skills. " +
            "They have completed some sessions on this skill. " +
            "Focus on reinforcing concepts from their recent sessions.",
            skill.getName()
        );
    }

    private String buildTutorPrompt(Skill skill, List<TutorMessageDto> messages, String sessionContext) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert, friendly AI tutor specializing in ").append(skill.getName()).append(".\n\n");
        prompt.append(sessionContext).append("\n\n");
        prompt.append("Your goal is to:\n");
        prompt.append("1. Answer questions about ").append(skill.getName()).append(" clearly and conversationally\n");
        prompt.append("2. Ask follow-up questions to deepen understanding\n");
        prompt.append("3. Occasionally ask quiz questions to assess knowledge\n");
        prompt.append("4. Provide encouragement and personalized feedback\n");
        prompt.append("5. Reference their previous sessions when relevant\n\n");

        // Add conversation history
        prompt.append("Conversation history:\n");
        for (TutorMessageDto msg : messages) {
            String role = "user".equals(msg.role()) ? "Learner" : "Tutor";
            prompt.append(role).append(": ").append(msg.content()).append("\n");
        }

        prompt.append("\nRespond naturally and helpfully. Keep your response to 2-3 sentences unless explaining a complex concept.\n");
        return prompt.toString();
    }

    private boolean shouldAskQuiz(List<TutorMessageDto> messages) {
        // Ask a quiz every 4-6 messages
        if (messages.size() < 4) {
            return false;
        }

        // Count recent quiz questions
        long recentQuizzes = messages.stream()
            .filter(m -> m.metadata() != null && Boolean.TRUE.equals(m.metadata().isQuiz()))
            .count();

        // If no quizzes recently, ask one
        return recentQuizzes < 1 && messages.size() % 6 == 0;
    }

    private record GeneratedQuiz(String question, List<String> options, int correctIndex, String explanation) {}

    /**
     * Ask the model for one real multiple-choice question grounded in the
     * conversation so far. Returns null when generation or parsing fails —
     * callers then skip the quiz instead of showing placeholder options.
     */
    private GeneratedQuiz generateQuiz(Skill skill, List<TutorMessageDto> messages) {
        String recentTopics = messages.stream()
            .skip(Math.max(0, messages.size() - 6))
            .map(TutorMessageDto::content)
            .collect(Collectors.joining("\n"));

        String prompt = """
            Based on this %s tutoring conversation:
            %s

            Write ONE multiple-choice quiz question testing what was just discussed.
            Respond with ONLY this JSON, nothing else:
            {"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "one sentence why"}
            """.formatted(skill.getName(), recentTopics);

        String response = aiProvider.generateText("tutor-quiz", prompt, "");
        if (response == null || response.isBlank()) {
            return null;
        }

        try {
            String json = response;
            int start = json.indexOf('{');
            int end = json.lastIndexOf('}');
            if (start < 0 || end <= start) return null;
            json = json.substring(start, end + 1);

            var node = objectMapper.readTree(json);
            String question = node.path("question").asText("");
            List<String> options = new ArrayList<>();
            node.path("options").forEach(o -> options.add(o.asText()));
            int correctIndex = node.path("correctIndex").asInt(-1);
            String explanation = node.path("explanation").asText("");

            if (question.isBlank() || options.size() < 2 || correctIndex < 0 || correctIndex >= options.size()) {
                return null;
            }
            return new GeneratedQuiz(question, options, correctIndex, explanation);
        } catch (Exception e) {
            log.warn("[TutorBot] Could not parse generated quiz: {}", e.getMessage());
            return null;
        }
    }

    private TutorConversationDto mapToDto(TutorBotConversation conversation) {
        List<TutorMessageDto> messages = loadMessageHistory(conversation);
        return new TutorConversationDto(
            conversation.getId(),
            conversation.getSkill().getId(),
            conversation.getSkill().getName(),
            conversation.getUser().getId(),
            messages,
            conversation.getTotalQuestionsAsked(),
            conversation.getQuestionsAnsweredCorrectly(),
            conversation.getAccuracyPercentage(),
            conversation.getLastInteractionAt() != null ? conversation.getLastInteractionAt().format(ISO_FORMATTER) : null,
            conversation.getCreatedAt().format(ISO_FORMATTER),
            conversation.getActive()
        );
    }
}
