package com.skillex.service.ai;

public interface AiProvider {
    String generateText(String useCase, String prompt, String fallback);
}
