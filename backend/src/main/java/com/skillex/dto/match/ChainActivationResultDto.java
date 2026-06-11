package com.skillex.dto.match;

import java.util.List;

/**
 * Result of activating a skill chain: one pending CHAIN_SWAP exchange per hop.
 */
public record ChainActivationResultDto(
    int exchangesCreated,
    int alreadyPending,
    List<String> exchangeIds,
    String summary
) {}
