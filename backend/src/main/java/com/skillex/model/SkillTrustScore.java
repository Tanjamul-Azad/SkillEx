package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "skill_trust_scores", uniqueConstraints = @UniqueConstraint(name = "uk_skill_trust_user_skill", columnNames = {"user_id", "skill_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillTrustScore {
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

    private Integer score;
    private Integer proofScore;
    private Integer sessionScore;
    private Integer reviewScore;
    private Integer skillCheckScore;
    private Integer safetyScore;
    private Boolean adminVerified;
    private LocalDateTime computedAt;
}
