package com.skillex.service;

import com.skillex.dto.ai.AiHelperRequest;
import com.skillex.dto.ai.AiHelperResponse;
import com.skillex.model.AiHelperConversation;
import com.skillex.model.User;
import com.skillex.repository.AiHelperConversationRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.ai.AiProvider;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ContextualHelpService {
    private final UserRepository userRepository;
    private final AiHelperConversationRepository conversationRepository;
    private final AiProvider aiProvider;

    @Transactional
    public AiHelperResponse respond(String userId, AiHelperRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        AiHelperResponse response = buildResponse(request);
        response = new AiHelperResponse(
            response.contextType(),
            aiProvider.generateText("contextual-help", request.prompt(), response.response()),
            response.suggestedActions(),
            response.safetyNote()
        );
        conversationRepository.save(AiHelperConversation.builder()
            .user(user)
            .contextType(request.contextType())
            .prompt(request.prompt())
            .response(response.response())
            .build());
        return response;
    }

    private AiHelperResponse buildResponse(AiHelperRequest request) {
        String context = request.contextType().toLowerCase(Locale.ROOT);
        String prompt = request.prompt().toLowerCase(Locale.ROOT);
        if (context.contains("onboarding")) {
            return new AiHelperResponse(request.contextType(),
                "Tell SkillEX what you can teach and what you want to learn in plain language. I will map it to catalog skills and keep unknown skills in the admin governance queue.",
                List.of("Write one teach goal", "Write one learn goal", "Pick up to three skills each"),
                "AI suggestions are editable before saving.");
        }
        if (context.contains("match")) {
            return new AiHelperResponse(request.contextType(),
                "A strong match should have two-way value, clear intent fit, reliable activity, and no active safety restrictions. Use the explanation panel before sending a request.",
                List.of("Review match reasons", "Send a respectful opening message", "Check profile proof"),
                "Do not share private contact details before trust is established.");
        }
        if (context.contains("admin") || prompt.contains("report")) {
            return new AiHelperResponse(request.contextType(),
                "Review the report, user history, rule category, severity, and evidence. AI can summarize risk, but only an admin should decide the final action.",
                List.of("Check evidence", "Choose rule", "Apply graduated action", "Record clear reason"),
                "AI cannot punish users automatically.");
        }
        if (context.contains("session")) {
            return new AiHelperResponse(request.contextType(),
                "Use transcripts and shared notes to generate a concise session summary, concepts covered, action items, and exportable notes.",
                List.of("Capture transcript", "Generate notes", "Review action items", "Submit feedback"),
                "Generated notes may need human correction if speech quality is low.");
        }
        return new AiHelperResponse(request.contextType(),
            "Focus on the next useful action: complete your profile, find a match, send an exchange request, schedule a session, or review your partner.",
            List.of("Complete profile", "Find match", "Open dashboard actions"),
            "SkillEX AI helpers provide guidance, not final decisions.");
    }
}
