package com.skillex.service;

import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;

/**
 * Service contract for natural-language skill intent interpretation.
 */
public interface SkillIntentService {

    SkillIntentInterpretResponse interpret(SkillIntentInterpretRequest request);
}
