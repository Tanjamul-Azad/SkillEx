package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.skill.SkillSearchResultDto;
import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;
import com.skillex.dto.skill.SuggestSkillRequest;
import com.skillex.dto.user.AddSkillRequest;
import com.skillex.dto.user.AddSkillResult;
import com.skillex.model.Skill;
import com.skillex.service.SkillCatalogGovernanceService;
import com.skillex.service.SkillIntentService;
import com.skillex.service.SkillService;
import com.skillex.service.AccountRestrictionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for skill catalog.
 * Base path: /api/skills
 */
@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;
    private final SkillIntentService skillIntentService;
    private final SkillCatalogGovernanceService governanceService;
    private final AccountRestrictionService restrictionService;

    /** GET /api/skills */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Skill>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(skillService.getAllSkills()));
    }

    /** GET /api/skills?page=0&size=20 */
    @GetMapping(params = {"page", "size"})
    public ResponseEntity<ApiResponse<PagedResponse<Skill>>> listPaged(
        @RequestParam int page,
        @RequestParam int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(skillService.getSkillsPage(page, size)));
    }

    /** GET /api/skills/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Skill>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(skillService.getSkillById(id)));
    }

    /**
     * POST /api/skills/interpret
     * Accepts natural language (teach/learn intents) and returns mapped skill suggestions.
     */
    @PostMapping("/interpret")
    public ResponseEntity<ApiResponse<SkillIntentInterpretResponse>> interpret(
        @RequestBody SkillIntentInterpretRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(skillIntentService.interpret(request)));
    }

    /** GET /api/skills/search?intent=... */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<SkillSearchResultDto>>> searchByIntent(
        @RequestParam("intent") String intent
    ) {
        return ResponseEntity.ok(ApiResponse.ok(skillService.searchByIntent(intent)));
    }

    /** POST /api/skills/suggest */
    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<AddSkillResult>> suggest(
        Authentication auth,
        @Valid @RequestBody SuggestSkillRequest req
    ) {
        restrictionService.assertCanUseAccount(userId(auth), "SKILL");
        AddSkillRequest addSkillRequest = new AddSkillRequest(
            null,
            req.skillName(),
            req.category(),
            req.description(),
            req.sourceIntent(),
            0,
            false,
            "BEGINNER",
            "wanted",
            null,
            null
        );

        AddSkillResult result = governanceService.submitUnknownSkill(userId(auth), addSkillRequest);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
