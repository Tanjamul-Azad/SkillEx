package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.math.BigDecimal;

/**
 * JPA entity mapping to the `session_transcripts` table.
 */
@Entity
@Table(name = "session_transcripts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionTranscript {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(name = "speaker_user_id", length = 36, nullable = false)
    private String speakerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "speaker_role", nullable = false, length = 10)
    private SpeakerRole speakerRole;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "spoken_at", nullable = false)
    private LocalDateTime spokenAt;

    @Column(name = "confidence_score")
    private BigDecimal confidenceScore;

    @Column(name = "detected_language", length = 16)
    private String detectedLanguage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum SpeakerRole { TEACHER, LEARNER }
}
