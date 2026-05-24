package com.skillex.service.impl;

import com.skillex.dto.certificate.BadgeDto;
import com.skillex.dto.certificate.CertificateDto;
import com.skillex.dto.trust.SkillTrustDto;
import com.skillex.model.*;
import com.skillex.repository.*;
import com.skillex.service.CertificateService;
import com.skillex.service.NotificationService;
import com.skillex.service.SkillTrustService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CertificateServiceImpl implements CertificateService {
    private static final int LEARNER_MIN_SESSIONS = 3;
    private static final double LEARNER_MIN_RATING = 4.0;
    private static final int MENTOR_MIN_SCORE = 70;
    private static final int MENTOR_MIN_SESSIONS = 3;
    private static final double MENTOR_MIN_RATING = 4.2;
    private static final int TRUSTED_MIN_SCORE = 85;
    private static final int TRUSTED_MIN_SESSIONS = 8;
    private static final double TRUSTED_MIN_RATING = 4.5;

    private final SkillCertificateRepository certificateRepository;
    private final CertificateEventRepository eventRepository;
    private final BadgeDefinitionRepository badgeDefinitionRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final SessionRepository sessionRepository;
    private final ReviewRepository reviewRepository;
    private final SkillTrustService skillTrustService;
    private final NotificationService notificationService;

    @Value("${app.public-base-url:http://localhost:3000}")
    private String publicBaseUrl;

    @Override
    @Transactional(readOnly = true)
    public List<CertificateDto> getMyCertificates(String userId) {
        return getUserCertificates(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateDto> getUserCertificates(String userId) {
        return certificateRepository.findByUserIdOrderByIssuedAtDesc(userId).stream()
            .map(this::toDto)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BadgeDto> getUserBadges(String userId) {
        return userBadgeRepository.findByUserIdAndStatusOrderByAwardedAtDesc(userId, UserBadge.BadgeStatus.ACTIVE)
            .stream()
            .map(this::toBadgeDto)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateDto getPublicCertificate(String verificationCode) {
        return certificateRepository.findByVerificationCode(verificationCode)
            .map(this::toDto)
            .orElseThrow(() -> new EntityNotFoundException("Certificate not found."));
    }

    @Override
    @Transactional(readOnly = true)
    public String githubBadgeSvg(String userId, String skillId) {
        List<SkillCertificate> certificates = certificateRepository.findByUserIdAndStatusOrderByIssuedAtDesc(userId, SkillCertificate.CertificateStatus.ACTIVE)
            .stream()
            .filter(c -> c.getSkill().getId().equals(skillId))
            .toList();
        String label = "SkillEX";
        String message = "not verified";
        String color = "64748b";
        if (!certificates.isEmpty()) {
            SkillCertificate best = certificates.get(0);
            message = switch (best.getCertificateType()) {
                case TRUSTED_MENTOR -> "trusted mentor";
                case SKILL_MENTOR -> "mentor";
                case SKILL_LEARNER -> "learner";
                case COMMUNITY_CONTRIBUTOR -> "community";
            };
            color = best.getCertificateType() == SkillCertificate.CertificateType.TRUSTED_MENTOR ? "00b894" : "00d1b2";
        }
        int labelWidth = Math.max(58, label.length() * 7 + 14);
        int messageWidth = Math.max(92, message.length() * 7 + 18);
        int width = labelWidth + messageWidth;
        return """
            <svg xmlns="http://www.w3.org/2000/svg" width="%d" height="20" role="img" aria-label="%s: %s">
              <linearGradient id="s" x2="0" y2="100%%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
              <clipPath id="r"><rect width="%d" height="20" rx="3" fill="#fff"/></clipPath>
              <g clip-path="url(#r)">
                <rect width="%d" height="20" fill="#111827"/>
                <rect x="%d" width="%d" height="20" fill="#%s"/>
                <rect width="%d" height="20" fill="url(#s)"/>
              </g>
              <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11">
                <text x="%d" y="15" fill="#010101" fill-opacity=".3">%s</text>
                <text x="%d" y="14">%s</text>
                <text x="%d" y="15" fill="#010101" fill-opacity=".3">%s</text>
                <text x="%d" y="14">%s</text>
              </g>
            </svg>
            """.formatted(width, escape(label), escape(message), width, labelWidth, labelWidth, messageWidth, color, width,
            labelWidth / 2, escape(label), labelWidth / 2, escape(label),
            labelWidth + messageWidth / 2, escape(message), labelWidth + messageWidth / 2, escape(message));
    }

    @Override
    @Transactional
    public void evaluateAfterSession(String sessionId) {
        Session session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || session.getSkill() == null) return;
        evaluateUserSkill(session.getTeacher().getId(), session.getSkill().getId());
        evaluateUserSkill(session.getLearner().getId(), session.getSkill().getId());
    }

    @Override
    @Transactional
    public void evaluateUserSkill(String userId, String skillId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        Skill skill = skillRepository.findById(skillId).orElseThrow(() -> new EntityNotFoundException("Skill not found: " + skillId));
        SkillTrustDto trust = skillTrustService.getTrust(userId, skillId);
        long teachingSessions = sessionRepository.countByTeacherIdAndSkillIdAndStatus(userId, skillId, Session.SessionStatus.COMPLETED);
        long learningSessions = sessionRepository.countByLearnerIdAndSkillIdAndStatus(userId, skillId, Session.SessionStatus.COMPLETED);
        double teacherRating = averageRating(userId, skillId);
        boolean safe = trust.safetyScore() >= 80;

        if (safe && learningSessions >= LEARNER_MIN_SESSIONS && teacherRating >= LEARNER_MIN_RATING) {
            issueIfMissing(user, skill, SkillCertificate.CertificateType.SKILL_LEARNER, "Skill Learner Certificate",
                "Career-ready learner", trust.score(), (int) learningSessions, teacherRating);
        }
        if (safe && trust.score() >= MENTOR_MIN_SCORE && teachingSessions >= MENTOR_MIN_SESSIONS && teacherRating >= MENTOR_MIN_RATING) {
            issueIfMissing(user, skill, SkillCertificate.CertificateType.SKILL_MENTOR, "Skill Mentor Certificate",
                "Trusted mentor", trust.score(), (int) teachingSessions, teacherRating);
            awardBadge(user, skill, "RELIABLE_MENTOR", "CERTIFICATE", null);
        }
        if (safe && trust.score() >= TRUSTED_MIN_SCORE && teachingSessions >= TRUSTED_MIN_SESSIONS && teacherRating >= TRUSTED_MIN_RATING
            && (trust.proofUploaded() || trust.adminVerified())) {
            issueIfMissing(user, skill, SkillCertificate.CertificateType.TRUSTED_MENTOR, "Trusted Mentor Certificate",
                "Highly trusted mentor", trust.score(), (int) teachingSessions, teacherRating);
            awardBadge(user, skill, "TRUSTED_MENTOR", "CERTIFICATE", null);
        }
        if (trust.proofUploaded()) {
            awardBadge(user, skill, "SKILL_PROOF_UPLOADED", "SKILL_TRUST", null);
        }
        if (trust.adminVerified()) {
            awardBadge(user, skill, "VERIFIED_SKILL", "SKILL_TRUST", null);
        }
        if (teacherRating >= 4.7 && teachingSessions >= 5) {
            awardBadge(user, skill, "TOP_RATED_TEACHER", "REVIEW", null);
        }
    }

    @Override
    @Transactional
    public void revokeUnsafeCredentials(String userId, String reason) {
        List<SkillCertificate> active = certificateRepository.findByUserIdAndStatus(userId, SkillCertificate.CertificateStatus.ACTIVE);
        for (SkillCertificate certificate : active) {
            certificate.setStatus(SkillCertificate.CertificateStatus.REVOKED);
            certificate.setRevokedAt(LocalDateTime.now());
            certificate.setRevokedReason(reason);
            certificateRepository.save(certificate);
            eventRepository.save(CertificateEvent.builder()
                .certificate(certificate)
                .eventType("REVOKED")
                .message(reason)
                .build());
        }
        for (UserBadge badge : userBadgeRepository.findByUserIdAndStatus(userId, UserBadge.BadgeStatus.ACTIVE)) {
            if (!"CREDIT_EARNER".equals(badge.getBadgeCode())) {
                badge.setStatus(UserBadge.BadgeStatus.REVOKED);
                badge.setRevokedAt(LocalDateTime.now());
                userBadgeRepository.save(badge);
            }
        }
        if (!active.isEmpty()) {
            notificationService.create(userId, null, "SYSTEM_UPDATE", "One or more SkillEX credentials were revoked because of an active account restriction.");
        }
    }

    @Override
    public CertificateDto toDto(SkillCertificate c) {
        String verifyUrl = verifyUrl(c.getVerificationCode());
        String badge = "![SkillEX %s](%s/api/public/badges/github/%s/%s)".formatted(
            c.getLevelLabel().replace(" ", "%20"),
            publicBaseUrl,
            c.getUser().getId(),
            c.getSkill().getId()
        );
        return new CertificateDto(
            c.getId(),
            c.getUser().getId(),
            c.getUser().getName(),
            c.getSkill().getId(),
            c.getSkill().getName(),
            c.getCertificateType().name(),
            c.getTitle(),
            c.getLevelLabel(),
            c.getTrustScoreSnapshot(),
            c.getSessionCountSnapshot(),
            c.getAverageRatingSnapshot(),
            c.getVerificationCode(),
            c.getStatus().name(),
            c.getRevokedReason(),
            c.getIssuedAt(),
            c.getRevokedAt(),
            verifyUrl,
            badge
        );
    }

    private void issueIfMissing(User user, Skill skill, SkillCertificate.CertificateType type, String title, String level,
                                int trustScore, int sessions, double averageRating) {
        if (certificateRepository.findByUserIdAndSkillIdAndCertificateType(user.getId(), skill.getId(), type).isPresent()) return;
        SkillCertificate certificate = SkillCertificate.builder()
            .user(user)
            .skill(skill)
            .certificateType(type)
            .title(title + " in " + skill.getName())
            .levelLabel(level)
            .trustScoreSnapshot(trustScore)
            .sessionCountSnapshot(sessions)
            .averageRatingSnapshot(BigDecimal.valueOf(averageRating).setScale(2, RoundingMode.HALF_UP))
            .verificationCode(generateVerificationCode(type))
            .status(SkillCertificate.CertificateStatus.ACTIVE)
            .issuedAt(LocalDateTime.now())
            .build();
        certificate = certificateRepository.save(certificate);
        eventRepository.save(CertificateEvent.builder()
            .certificate(certificate)
            .eventType("ISSUED")
            .message("Certificate issued automatically from SkillEX trust signals.")
            .build());
        notificationService.create(user.getId(), null, "SYSTEM_UPDATE", "You earned a " + certificate.getTitle() + ".");
    }

    private void awardBadge(User user, Skill skill, String code, String sourceType, String sourceId) {
        if (userBadgeRepository.findByUserIdAndBadgeCodeAndSkillId(user.getId(), code, skill != null ? skill.getId() : null).isPresent()) return;
        UserBadge saved = userBadgeRepository.save(UserBadge.builder()
            .user(user)
            .skill(skill)
            .badgeCode(code)
            .sourceType(sourceType)
            .sourceId(sourceId)
            .status(UserBadge.BadgeStatus.ACTIVE)
            .build());
        BadgeDefinition definition = badgeDefinitionRepository.findByCode(saved.getBadgeCode()).orElse(null);
        String name = definition != null ? definition.getName() : code.replace("_", " ");
        notificationService.create(user.getId(), null, "SYSTEM_UPDATE", "You earned the " + name + " badge.");
    }

    private BadgeDto toBadgeDto(UserBadge badge) {
        BadgeDefinition definition = badgeDefinitionRepository.findByCode(badge.getBadgeCode()).orElse(null);
        return new BadgeDto(
            badge.getId(),
            badge.getBadgeCode(),
            definition != null ? definition.getName() : badge.getBadgeCode().replace("_", " "),
            definition != null ? definition.getDescription() : "SkillEX achievement badge.",
            definition != null ? definition.getIcon() : "Award",
            definition != null ? definition.getCategory() : "GENERAL",
            badge.getSkill() != null ? badge.getSkill().getId() : null,
            badge.getSkill() != null ? badge.getSkill().getName() : null,
            badge.getStatus().name(),
            badge.getAwardedAt()
        );
    }

    private double averageRating(String userId, String skillId) {
        Double value = reviewRepository.findAverageRatingByToUserIdAndSkillId(userId, skillId);
        return value == null ? 0.0 : value;
    }

    private String generateVerificationCode(SkillCertificate.CertificateType type) {
        return "SKX-" + type.name().replace("_", "-") + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private String verifyUrl(String code) {
        return UriComponentsBuilder.fromUriString(publicBaseUrl)
            .path("/verify/certificate/")
            .path(code)
            .build()
            .toString();
    }

    private String escape(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
