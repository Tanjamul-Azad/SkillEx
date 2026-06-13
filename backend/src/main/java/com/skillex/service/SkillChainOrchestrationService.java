package com.skillex.service;

import com.skillex.dto.match.ChainActivationRequest;
import com.skillex.dto.match.ChainActivationResultDto;
import com.skillex.dto.match.ChainStatusDto;
import java.util.List;

public interface SkillChainOrchestrationService {

    /**
     * Set a detected exchange cycle in motion: create one pending CHAIN_SWAP
     * exchange per hop and notify every participant. The caller must be one
     * of the chain's participants.
     *
     * @param activatorUserId authenticated user kicking off the chain
     * @param request the cycle hops as returned by the match engine
     * @return how many exchanges were created vs. already pending
     */
    ChainActivationResultDto activateChain(String activatorUserId, ChainActivationRequest request);

    /**
     * Compute live per-hop status of a (possibly) activated skill chain.
     */
    ChainStatusDto getChainStatus(List<ChainActivationRequest.Hop> hops);
}
