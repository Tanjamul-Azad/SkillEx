package com.skillex.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * JPA entity mapping to the `session_notes` table.
 * 
 * OOP Requirements satisfied:
 * - Strictly private fields
 * - Explicit constructors
 * - Domain behaviors: isEmpty(), hasActionItems(), wordCount(), toMarkdown()
 * - No public setters for key-concept/summary fields
 */
@Entity
@Table(name = "session_notes")
@Getter
@NoArgsConstructor
public class SessionNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private Session session;

    @Column(name = "key_concepts", columnDefinition = "TEXT")
    private String keyConcepts;

    @Column(name = "action_items", columnDefinition = "TEXT")
    private String actionItems;

    @Column(name = "resources_mentioned", columnDefinition = "TEXT")
    private String resourcesMentioned;

    @Column(columnDefinition = "TEXT")
    private String summary;

    /** Long-form, chronological "what actually happened" study guide. The main shareable artifact. */
    @Column(name = "detailed_notes", columnDefinition = "LONGTEXT")
    private String detailedNotes;

    @Column(name = "raw_transcript", columnDefinition = "TEXT")
    private String rawTranscript;

    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Explicit constructor for Note synthesis
     */
    public SessionNote(Session session, String keyConcepts, String actionItems, String resourcesMentioned, String summary, String detailedNotes, String rawTranscript) {
        this.session = session;
        this.keyConcepts = keyConcepts;
        this.actionItems = actionItems;
        this.resourcesMentioned = resourcesMentioned;
        this.summary = summary;
        this.detailedNotes = detailedNotes;
        this.rawTranscript = rawTranscript;
        this.generatedAt = LocalDateTime.now();
    }

    public void replaceGeneratedContent(
            String keyConcepts,
            String actionItems,
            String resourcesMentioned,
            String summary,
            String detailedNotes,
            String rawTranscript
    ) {
        this.keyConcepts = keyConcepts;
        this.actionItems = actionItems;
        this.resourcesMentioned = resourcesMentioned;
        this.summary = summary;
        this.detailedNotes = detailedNotes;
        this.rawTranscript = rawTranscript;
        this.generatedAt = LocalDateTime.now();
    }

    // Encapsulated Domain Behaviors

    /**
     * Checks if the generated note contains any actual synthesized data.
     */
    public boolean isEmpty() {
        return (keyConcepts == null || keyConcepts.isBlank())
            && (actionItems == null || actionItems.isBlank())
            && (resourcesMentioned == null || resourcesMentioned.isBlank())
            && (detailedNotes == null || detailedNotes.isBlank())
            && (summary == null || summary.isBlank());
    }

    /**
     * Returns true if there are action items outlined for the participants.
     */
    public boolean hasActionItems() {
        return actionItems != null && !actionItems.isBlank();
    }

    /**
     * Synthesizes the full note into a beautiful, standardized Markdown document.
     */
    public String toMarkdown() {
        StringBuilder sb = new StringBuilder();
        sb.append("# AI Session Notes\n\n");
        
        if (summary != null && !summary.isBlank()) {
            sb.append("## Executive Summary\n").append(summary).append("\n\n");
        }
        if (detailedNotes != null && !detailedNotes.isBlank()) {
            sb.append("## Detailed Session Walkthrough\n").append(detailedNotes).append("\n\n");
        }
        if (keyConcepts != null && !keyConcepts.isBlank()) {
            sb.append("## Key Concepts Learned\n").append(keyConcepts).append("\n\n");
        }
        if (actionItems != null && !actionItems.isBlank()) {
            sb.append("## Recommended Action Items\n").append(actionItems).append("\n\n");
        }
        if (resourcesMentioned != null && !resourcesMentioned.isBlank()) {
            sb.append("## Resources & Links Mentioned\n").append(resourcesMentioned).append("\n\n");
        }
        
        return sb.toString();
    }

    /**
     * Calculates the aggregate word count across all key content fields.
     */
    public int wordCount() {
        int count = 0;
        count += getWordCount(keyConcepts);
        count += getWordCount(actionItems);
        count += getWordCount(resourcesMentioned);
        count += getWordCount(summary);
        count += getWordCount(detailedNotes);
        return count;
    }

    private int getWordCount(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }
}
