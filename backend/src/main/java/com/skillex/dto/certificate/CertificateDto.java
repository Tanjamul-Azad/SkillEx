package com.skillex.dto.certificate;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CertificateDto(
    String id,
    String userId,
    String userName,
    String skillId,
    String skillName,
    String certificateType,
    String title,
    String levelLabel,
    Integer trustScoreSnapshot,
    Integer sessionCountSnapshot,
    BigDecimal averageRatingSnapshot,
    String verificationCode,
    String status,
    String revokedReason,
    LocalDateTime issuedAt,
    LocalDateTime revokedAt,
    String verificationUrl,
    String githubBadgeMarkdown
) {}
