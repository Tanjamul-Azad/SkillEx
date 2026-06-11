package com.skillex.dto.ai;

import java.time.LocalDateTime;
import java.util.List;

public record GroupSessionDto(
    String id,
    String mentorId,
    String mentorName,
    String mentorAvatar,
    String skillId,
    String skillName,
    String title,
    String description,
    LocalDateTime scheduledAt,
    int durationMinutes,
    int maxAttendees,
    List<Attendee> attendees,
    String status, // SCHEDULED, IN_PROGRESS, COMPLETED
    String sharedNotes,
    LocalDateTime createdAt
) {
    public record CreateRequest(
        String skillId,
        String title,
        String description,
        LocalDateTime scheduledAt,
        int durationMinutes,
        int maxAttendees
    ) {}

    public record AiDraftRequest(
        String skillId,
        String audienceLevel,
        String goal
    ) {}

    public record WorkshopDraft(
        String title,
        String description,
        int durationMinutes,
        int maxAttendees,
        String agenda,
        String prerequisites,
        String takeaways
    ) {}

    public record Attendee(
        String userId,
        String name,
        String avatar,
        LocalDateTime joinedAt,
        boolean certificateEarned
    ) {}

    public record GroupCertificate(
        String id,
        String learnerUserId,
        String learnerName,
        String skillName,
        String sessionId,
        String mentorName,
        int attendeeCount,
        LocalDateTime issueDate,
        String certificateUrl
    ) {}
}
