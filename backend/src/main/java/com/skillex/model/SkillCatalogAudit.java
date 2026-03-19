package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Audit trail for catalog governance actions.
 */
@Entity
@Table(name = "skill_catalog_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillCatalogAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Action action;

    @Column(name = "pending_skill_id", length = 36)
    private String pendingSkillId;

    @Column(name = "skill_id", length = 36)
    private String skillId;

    @Column(name = "actor_user_id", length = 36)
    private String actorUserId;

    @Column(length = 500)
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum Action { SUBMITTED, UPDATED, AUTO_PROMOTED, APPROVED, REJECTED }
}
