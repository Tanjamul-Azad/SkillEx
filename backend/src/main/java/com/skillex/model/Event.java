package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity mapping to the `events` table.
 *
 * OOP notes:
 *  - host is a User FK — the organiser
 *  - attendees is ManyToMany via event_attendees join table
 *  - skills is ManyToMany via event_skills join table (defined in V1 schema)
 */
@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    @Column(length = 300)
    @Builder.Default
    private String location = "";

    @Column(name = "is_online", nullable = false)
    @Builder.Default
    private Boolean isOnline = true;

    @Column(name = "cover_gradient", length = 200)
    @Builder.Default
    private String coverGradient = "from-primary to-secondary";

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 24)
    @Builder.Default
    private EventType eventType = EventType.WORKSHOP;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circle_id")
    private SkillCircle circle;

    @Column(name = "meeting_url", length = 500)
    private String meetingUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private EventStatus status = EventStatus.SCHEDULED;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "event_skills",
        joinColumns = @JoinColumn(name = "event_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    @Builder.Default
    private List<Skill> skills = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "event_attendees",
        joinColumns = @JoinColumn(name = "event_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> attendees = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum EventType {
        ANNOUNCEMENT,
        WORKSHOP,
        STUDY_SPRINT,
        OFFICE_HOUR,
        HACKATHON,
        PORTFOLIO_REVIEW
    }

    public enum EventStatus { SCHEDULED, CANCELLED, COMPLETED }
}
