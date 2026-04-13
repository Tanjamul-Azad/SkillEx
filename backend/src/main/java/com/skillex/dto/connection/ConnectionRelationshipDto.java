package com.skillex.dto.connection;

/**
 * Relationship state between the current user and a target user.
 *
 * status values:
 * - NONE
 * - PENDING_SENT
 * - PENDING_RECEIVED
 * - CONNECTED
 */
public record ConnectionRelationshipDto(
    String targetUserId,
    String status,
    String connectionId,
    boolean canMessage
) {}
