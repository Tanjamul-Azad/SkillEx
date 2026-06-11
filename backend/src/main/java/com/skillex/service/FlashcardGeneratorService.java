package com.skillex.service;

import com.skillex.dto.StudyMaterialDto;
import java.util.Optional;

/**
 * Service interface for generating flashcards, quiz questions, and action items
 * from existing session notes using LLM-powered extraction.
 */
public interface FlashcardGeneratorService {

    /**
     * Generates study materials (flashcards, quiz questions, action items)
     * from an existing session note using the configured AI provider.
     *
     * @param sessionId The ID of the session to generate study materials for
     * @return StudyMaterialDto containing flashcards, questions, and action items
     * @throws IllegalArgumentException if session or notes not found
     */
    StudyMaterialDto generateStudyMaterials(String sessionId);

    /**
     * Retrieves previously generated study materials for a session, if available.
     * Note: Current implementation generates on-demand; this may be enhanced
     * to support caching in a future phase.
     *
     * @param sessionId The ID of the session
     * @return Optional containing study materials if they exist
     */
    Optional<StudyMaterialDto> getStudyMaterials(String sessionId);
}
