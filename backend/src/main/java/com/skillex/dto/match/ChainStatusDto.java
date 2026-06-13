package com.skillex.dto.match;

import java.util.List;

/**
 * Live per-hop status of a (possibly) activated skill chain.
 *
 * <p>Computed by matching each detected hop to its real {@code CHAIN_SWAP}
 * {@link com.skillex.model.Exchange} (requester = learner, receiver = teacher).
 * A hop with no matching exchange has status {@code NONE} — the chain (or that
 * hop) has not been started yet.
 */
public record ChainStatusDto(
    boolean started,
    int totalHops,
    int pending,
    int accepted,
    int completed,
    int declined,
    int progress,
    List<HopStatus> hops
) {
    /**
     * Status of a single hop.
     *
     * @param fromUserId teaching participant
     * @param toUserId   receiving participant
     * @param status     NONE | PENDING | ACCEPTED | COMPLETED | DECLINED | CANCELLED
     * @param exchangeId the backing exchange, or {@code null} when not started
     */
    public record HopStatus(
        String fromUserId,
        String toUserId,
        String status,
        String exchangeId
    ) {}
}
