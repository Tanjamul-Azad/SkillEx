package com.skillex.controller;

import com.skillex.dto.ai.CircleBlurbDto;
import com.skillex.dto.ai.GeneratedBioDto;
import com.skillex.dto.ai.ProfileAssistantSuggestionDto;
import com.skillex.dto.ai.SkillDescriptionDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.ProfileAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST endpoints for the AI Profile Assistant feature.
 * Provides AI-powered suggestions for:
 * - Professional bios
 * - Skill descriptions
 * - Circle blurbs
 */
@RestController
@RequestMapping("/api/ai/profile-assistant")
@RequiredArgsConstructor
public class ProfileAssistantController {

    private final ProfileAssistantService profileAssistantService;

    /**
     * Generate 3 professional bio suggestions from a user's rough self-description.
     * POST /api/ai/profile-assistant/suggest-bio
     * @param request Contains: topic (user's self-description)
     * @return 3 polished bio suggestions
     */
    @PostMapping("/suggest-bio")
    public ResponseEntity<ApiResponse<ProfileAssistantSuggestionDto>> suggestBio(
            Authentication auth,
            @Valid @RequestBody GeneratedBioDto request
    ) {
        ProfileAssistantSuggestionDto suggestions = profileAssistantService.suggestBios(request.topic());
        return ResponseEntity.ok(ApiResponse.ok(suggestions));
    }

    /**
     * Generate 3 polished skill descriptions from skill name and proficiency level.
     * POST /api/ai/profile-assistant/suggest-skill-description
     * @param request Contains: skillName, level
     * @return 3 skill description suggestions
     */
    @PostMapping("/suggest-skill-description")
    public ResponseEntity<ApiResponse<ProfileAssistantSuggestionDto>> suggestSkillDescription(
            Authentication auth,
            @Valid @RequestBody SkillDescriptionDto request
    ) {
        ProfileAssistantSuggestionDto suggestions = profileAssistantService.suggestSkillDescriptions(
                request.skillName(),
                request.level()
        );
        return ResponseEntity.ok(ApiResponse.ok(suggestions));
    }

    /**
     * Generate 3 compelling circle blurbs from circle name and topic.
     * POST /api/ai/profile-assistant/suggest-circle-blurb
     * @param request Contains: circleName, topic
     * @return 3 circle blurb suggestions
     */
    @PostMapping("/suggest-circle-blurb")
    public ResponseEntity<ApiResponse<ProfileAssistantSuggestionDto>> suggestCircleBlurb(
            Authentication auth,
            @Valid @RequestBody CircleBlurbDto request
    ) {
        ProfileAssistantSuggestionDto suggestions = profileAssistantService.suggestCircleBlurbs(
                request.circleName(),
                request.topic()
        );
        return ResponseEntity.ok(ApiResponse.ok(suggestions));
    }
}
