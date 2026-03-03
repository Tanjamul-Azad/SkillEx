package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
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

    private final SkillRepository skillRepository;

    /** GET /api/skills — list all skills (optionally filter by keyword or category) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Skill>>> list(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String category
    ) {
        List<Skill> skills;
        if (keyword != null && !keyword.isBlank()) {
            skills = skillRepository.findByNameContainingIgnoreCase(keyword);
        } else if (category != null && !category.isBlank()) {
            skills = skillRepository.findByCategoryIgnoreCase(category);
        } else {
            skills = skillRepository.findAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(skills));
    }

    /** GET /api/skills/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Skill>> getById(@PathVariable @NonNull String id) {
        return skillRepository.findById(id)
            .map(skill -> ResponseEntity.ok(ApiResponse.ok(skill)))
            .orElse(ResponseEntity.notFound().build());
    }
}
