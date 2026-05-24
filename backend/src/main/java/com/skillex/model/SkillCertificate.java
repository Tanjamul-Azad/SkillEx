package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "skill_certificates", uniqueConstraints = {
    @UniqueConstraint(name = "uk_skill_certificate_user_skill_type", columnNames = {"user_id", "skill_id", "certificate_type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillCertificate {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Enumerated(EnumType.STRING)
    @Column(name = "certificate_type", nullable = false, length = 40)
    private CertificateType certificateType;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(name = "level_label", nullable = false, length = 60)
    private String levelLabel;

    @Column(name = "trust_score_snapshot", nullable = false)
    private Integer trustScoreSnapshot;

    @Column(name = "session_count_snapshot", nullable = false)
    private Integer sessionCountSnapshot;

    @Column(name = "average_rating_snapshot", nullable = false, precision = 3, scale = 2)
    private BigDecimal averageRatingSnapshot;

    @Column(name = "verification_code", nullable = false, unique = true, length = 80)
    private String verificationCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CertificateStatus status = CertificateStatus.ACTIVE;

    @Column(name = "revoked_reason", length = 500)
    private String revokedReason;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum CertificateType {
        SKILL_LEARNER,
        SKILL_MENTOR,
        TRUSTED_MENTOR,
        COMMUNITY_CONTRIBUTOR
    }

    public enum CertificateStatus {
        ACTIVE,
        REVOKED
    }
}
