package com.skillex.service;

import com.skillex.model.ContentReport;
import com.skillex.model.ModerationActionType;
import com.skillex.model.ModerationSeverity;
import com.skillex.service.ai.AiProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ModerationAiAssistService {
    private final AiProvider aiProvider;

    public AiModerationSuggestion suggest(ContentReport report) {
        String text = ((report.getCategory() == null ? "" : report.getCategory()) + " "
            + (report.getReason() == null ? "" : report.getReason()) + " "
            + (report.getEvidence() == null ? "" : report.getEvidence())).toLowerCase(Locale.ROOT);

        if (containsAny(text, "threat", "harass", "abuse", "hate", "danger", "illegal")) {
            String fallback = "The report indicates a safety risk. Review context, prior history, and whether the target user threatened or harassed another member.";
            return new AiModerationSuggestion(
                aiProvider.generateText("moderation-assist", text, fallback),
                ModerationSeverity.HIGH,
                ModerationActionType.SUSPEND_ACCOUNT
            );
        }
        if (containsAny(text, "spam", "scam", "bot", "promotion", "fake link")) {
            String fallback = "The report looks like spam or platform abuse. Check repeated behavior before applying a posting restriction.";
            return new AiModerationSuggestion(
                aiProvider.generateText("moderation-assist", text, fallback),
                ModerationSeverity.MEDIUM,
                ModerationActionType.RESTRICT_POSTING
            );
        }
        if (containsAny(text, "fake", "misleading", "credential", "not skilled", "proof")) {
            String fallback = "The concern appears related to trust or skill authenticity. Ask for proof or issue a warning for first-time cases.";
            return new AiModerationSuggestion(
                aiProvider.generateText("moderation-assist", text, fallback),
                ModerationSeverity.MEDIUM,
                ModerationActionType.WARN
            );
        }
        String fallback = "The report needs human review. Start with context, prior reports, and whether the content violates a written platform rule.";
        return new AiModerationSuggestion(
            aiProvider.generateText("moderation-assist", text, fallback),
            ModerationSeverity.LOW,
            ModerationActionType.NO_ACTION
        );
    }

    private boolean containsAny(String text, String... terms) {
        for (String term : terms) {
            if (text.contains(term)) return true;
        }
        return false;
    }

    public record AiModerationSuggestion(String summary, ModerationSeverity severity, ModerationActionType actionType) {}
}
