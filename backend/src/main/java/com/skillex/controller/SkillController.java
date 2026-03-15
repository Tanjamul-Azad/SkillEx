package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;
import com.skillex.model.Skill;
import com.skillex.service.SkillIntentService;
import com.skillex.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    /** GET /api/skills */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Skill>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(skillService.getAllSkills()));
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
}
