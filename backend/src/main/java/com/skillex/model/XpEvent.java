package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "xp_events", uniqueConstraints = {
    @UniqueConstraint(name = "uk_xp_events_source", columnNames = {"user_id", "source_type", "source_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class XpEvent {
    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "source_type", nullable = false, length = 60)
    private String sourceType;

    @Column(name = "source_id", nullable = false, length = 120)
    private String sourceId;

    @Column(name = "xp_delta", nullable = false)
    private Integer xpDelta;

    @Column(nullable = false, length = 255)
    private String reason;

    @CreationTimestamp
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt;

    @PrePersist
    void prePersist() {
        if (id == null || id.isBlank()) {
            id = java.util.UUID.randomUUID().toString();
        }
    }
}
