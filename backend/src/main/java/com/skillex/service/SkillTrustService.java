package com.skillex.service;

import com.skillex.dto.trust.SkillTrustDto;

public interface SkillTrustService {
    SkillTrustDto getTrust(String userId, String skillId);
}
