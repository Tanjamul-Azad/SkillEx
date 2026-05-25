package com.skillex.service.impl;

import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;
import com.skillex.dto.skill.SkillIntentInterpretResultDto;
import com.skillex.dto.skill.SkillIntentSuggestionDto;
import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SkillIntentServiceImplTest {

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private GrokSkillIntentMatcher grokSkillIntentMatcher;

    @InjectMocks
    private SkillIntentServiceImpl service;

    @BeforeEach
    void setUp() {
        when(skillRepository.findAll()).thenReturn(List.of(
            skill("web", "Web Development", "Tech", "Build responsive websites with HTML, CSS, JavaScript and modern frameworks"),
            skill("data", "Data Science", "Tech", "Analyse and visualise data using Python, pandas, matplotlib and machine learning"),
            skill("french", "French Language", "Language", "Learn French from conversational basics to business-level fluency"),
            skill("calligraphy", "Calligraphy", "Creative", "Master beautiful handwriting and lettering")
        ));
        when(grokSkillIntentMatcher.interpret(any(), anyList())).thenReturn(Optional.empty());
    }

    @Test
    void interpret_shouldMapFrontendIntentToWebDevelopment() {
        SkillIntentInterpretResponse result = service.interpret(new SkillIntentInterpretRequest(
            "I can do the frontend part basically React, JS, NextJs",
            null
        ));

        assertEquals("Web Development", result.teach().primary().skillName());
        assertFalse(result.teach().primary().custom());
        assertTrue(result.teach().primary().confidence() >= 90);
    }

    @Test
    void interpret_shouldCreateCustomAiLlmIntegrationSkillInsteadOfWeakCreativeMatch() {
        SkillIntentInterpretResponse result = service.interpret(new SkillIntentInterpretRequest(
            null,
            "I need to learn the AI/ML integration, API calls, LLM creation personalized"
        ));

        assertEquals("AI/ML and LLM Integration", result.learn().primary().skillName());
        assertTrue(result.learn().primary().custom());
        assertEquals("Tech", result.learn().primary().category());
        assertTrue(result.learn().alternatives().stream()
            .noneMatch(suggestion -> suggestion.skillName().equals("Calligraphy")));
    }

    @Test
    void interpret_shouldOverrideBroadGrokCatalogMatchForAiApplicationIntent() {
        when(grokSkillIntentMatcher.interpret(any(), anyList())).thenReturn(Optional.of(
            new SkillIntentInterpretResponse(
                new SkillIntentInterpretResultDto(null, null, null, List.of()),
                new SkillIntentInterpretResultDto(
                    "I need to learn the AI/ML integration, API calls, LLM creation personalized",
                    "Moderate",
                    new SkillIntentSuggestionDto("data", "Data Science", "Tech", 74, false),
                    List.of(new SkillIntentSuggestionDto("data", "Data Science", "Tech", 74, false))
                )
            )
        ));

        SkillIntentInterpretResponse result = service.interpret(new SkillIntentInterpretRequest(
            null,
            "I need to learn the AI/ML integration, API calls, LLM creation personalized"
        ));

        assertEquals("AI/ML and LLM Integration", result.learn().primary().skillName());
        assertTrue(result.learn().primary().custom());
    }

    private static Skill skill(String id, String name, String category, String description) {
        Skill skill = new Skill();
        skill.setId(id);
        skill.setName(name);
        skill.setCategory(category);
        skill.setIcon("Code");
        skill.setDescription(description);
        return skill;
    }
}
