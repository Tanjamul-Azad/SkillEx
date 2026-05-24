package com.skillex.service.ai;

import org.springframework.stereotype.Component;

@Component
public class LocalFallbackAiProvider implements AiProvider {
    @Override
    public String generateText(String useCase, String prompt, String fallback) {
        return fallback;
    }
}
