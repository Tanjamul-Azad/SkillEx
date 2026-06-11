package com.skillex.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "resume_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeProfile {
    @Id
    @Column(length = 36, updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "resume_url", length = 600)
    private String resumeUrl;

    @Column(name = "source_filename", length = 255)
    private String sourceFilename;

    @Column(name = "content_type", length = 120)
    private String contentType;

    @Column(name = "extraction_method", nullable = false, length = 40)
    private String extractionMethod;

    @Column(nullable = false, length = 30)
    private String status;

    @Lob
    @Column(name = "raw_text", columnDefinition = "LONGTEXT")
    private String rawText;

    @Column(length = 180)
    private String headline;

    @Column(name = "education_summary", columnDefinition = "TEXT")
    private String educationSummary;

    @Column(name = "experience_summary", columnDefinition = "TEXT")
    private String experienceSummary;

    @Column(name = "project_summary", columnDefinition = "TEXT")
    private String projectSummary;

    @Column(name = "certification_summary", columnDefinition = "TEXT")
    private String certificationSummary;

    @Column(name = "tools_summary", columnDefinition = "TEXT")
    private String toolsSummary;

    @Column(name = "language_summary", columnDefinition = "TEXT")
    private String languageSummary;

    @Column(name = "career_goal", columnDefinition = "TEXT")
    private String careerGoal;

    @Column(name = "teach_summary", columnDefinition = "TEXT")
    private String teachSummary;

    @Column(name = "learn_summary", columnDefinition = "TEXT")
    private String learnSummary;

    @Lob
    @Column(name = "suggested_offered_skills_json", columnDefinition = "LONGTEXT")
    private String suggestedOfferedSkillsJson;

    @Lob
    @Column(name = "suggested_wanted_skills_json", columnDefinition = "LONGTEXT")
    private String suggestedWantedSkillsJson;

    @Lob
    @Column(name = "profile_signals_json", columnDefinition = "LONGTEXT")
    private String profileSignalsJson;

    @Column(nullable = false)
    private int confidence;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
