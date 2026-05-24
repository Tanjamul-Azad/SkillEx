package com.skillex.service;

import com.skillex.dto.certificate.BadgeDto;
import com.skillex.dto.certificate.CertificateDto;
import com.skillex.model.SkillCertificate;

import java.util.List;

public interface CertificateService {
    List<CertificateDto> getMyCertificates(String userId);
    List<CertificateDto> getUserCertificates(String userId);
    List<BadgeDto> getUserBadges(String userId);
    CertificateDto getPublicCertificate(String verificationCode);
    String githubBadgeSvg(String userId, String skillId);
    void evaluateUserSkill(String userId, String skillId);
    void evaluateAfterSession(String sessionId);
    void revokeUnsafeCredentials(String userId, String reason);
    CertificateDto toDto(SkillCertificate certificate);
}
