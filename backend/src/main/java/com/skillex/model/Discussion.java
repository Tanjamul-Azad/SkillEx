package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * JPA entity mapping to the `discussions` table.
 *
 * OOP notes:
 *  - upvotes / replies / views are managed via service layer increments
 *  - is_pinned set by admin role only (enforced in service layer)
 *  - author FK cascades so deleting a user removes their discussions
 */
@Entity
@Table(name = "discussions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Discussion {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "cover_image_url", length = 512)
    private String coverImageUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(length = 100)
    @Builder.Default
    private String category = "General";

    @Column(nullable = false)
    @Builder.Default
    private Integer upvotes = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer replies = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer views = 0;

    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private Boolean isPinned = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "thread_type", nullable = false, length = 24)
    @Builder.Default
    private ThreadType threadType = ThreadType.QUESTION;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id")
    private Skill skill;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circle_id")
    private SkillCircle circle;

    /** Optional link to a community event — powers the per-event discussion/activity wall. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    @Builder.Default
    private DiscussionStatus status = DiscussionStatus.OPEN;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_reply_id")
    private DiscussionReply acceptedReply;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum ThreadType {
        QUESTION,
        RESOURCE_REQUEST,
        PROJECT_REVIEW,
        SUCCESS_STORY,
        ANNOUNCEMENT
    }

    public enum DiscussionStatus { OPEN, SOLVED }
}
