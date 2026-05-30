package com.skillex.dto.portfolio;

import java.time.LocalDateTime;

public record PortfolioProofDto(
    String id,
    String userId,
    SkillRef skill,
    String title,
    String description,
    String proofType,
    String url,
    String mediaUrl,
    String sourceSessionId,
    String visibility,
    boolean featured,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public record SkillRef(String id, String name, String icon, String category) {}
}
