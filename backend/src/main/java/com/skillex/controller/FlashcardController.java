package com.skillex.controller;

import com.skillex.dto.StudyMaterialDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.FlashcardGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for flashcard and study material generation.
 * Base path: /api/sessions/{sessionId}/study-materials
 */
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardGeneratorService flashcardGeneratorService;

    /**
     * GET /api/sessions/{sessionId}/study-materials
     * Generates flashcards, quiz questions, and action items from session notes.
     *
     * @param sessionId The ID of the session to generate materials for
     * @return StudyMaterialDto containing flashcards, quiz questions, and action items
     */
    @GetMapping("/{sessionId}/study-materials")
    public ResponseEntity<ApiResponse<StudyMaterialDto>> getStudyMaterials(
            @PathVariable String sessionId
    ) {
        try {
            StudyMaterialDto materials = flashcardGeneratorService.generateStudyMaterials(sessionId);
            return ResponseEntity.ok(ApiResponse.ok(materials));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to generate study materials: " + e.getMessage()));
        }
    }
}
