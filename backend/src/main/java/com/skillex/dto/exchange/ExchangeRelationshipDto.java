package com.skillex.dto.exchange;

/**
 * Relationship state for skill exchanges between the current user and a target user.
 *
 * status values:
 * - NONE
 * - PENDING_SENT
 * - PENDING_RECEIVED
 * - ACCEPTED
 * - COMPLETED
 * - CANCELLED
 * - DECLINED
 */
public record ExchangeRelationshipDto(
    String targetUserId,
    String status,
    String exchangeId
) {}
