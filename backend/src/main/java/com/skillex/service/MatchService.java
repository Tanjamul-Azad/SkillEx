package com.skillex.service;

import com.skillex.dto.user.MatchUserDto;

import java.util.List;

/**
 * Contract for the skill-matching algorithm.
 *
 * Compatibility score formula (max 100):
 *   sharedSkillOverlap × 20 + rating × 10 + min(skillexScore / 10, 20)
 */
public interface MatchService {

    List<MatchUserDto> findMatches(String userId, int limit);
}
