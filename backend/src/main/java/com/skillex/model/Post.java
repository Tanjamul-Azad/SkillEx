package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * JPA entity mapping to the `posts` table.
 *
 * OOP notes:
 *  - type ENUM maps PostType (SHOWCASE, ACHIEVEMENT, EXCHANGE, QUESTION)
 *  - skill and badge are optional — present only for skill-showcase/achievement posts
 *  - likes/comments/shares are counter fields incremented atomically in service layer
 */
@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private PostType type = PostType.SHOWCASE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id")
    private Skill skill;

    @Column(length = 100)
    private String badge;

    @Column(nullable = false)
    @Builder.Default
    private Integer likes = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer comments = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer shares = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum PostType { SHOWCASE, ACHIEVEMENT, EXCHANGE, QUESTION }
}
