package com.skillex.dto.user;

/**
 * Result contract for add-skill operation.
 */
public record AddSkillResult(
    String status,   // ADDED | PENDING
    String message,
    String skillId,
    String pendingId
) {}
