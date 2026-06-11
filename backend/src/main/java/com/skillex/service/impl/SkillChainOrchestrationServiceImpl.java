package com.skillex.service.impl;

import com.skillex.dto.match.ChainActivationRequest;
import com.skillex.dto.match.ChainActivationResultDto;
import com.skillex.model.Exchange;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.NotificationService;
import com.skillex.service.SkillChainOrchestrationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Turns a detected exchange cycle into live, trackable exchange requests.
 *
 * <p>One pending CHAIN_SWAP exchange is created per hop (learner requests the
 * hop's skill from the hop's teacher). Every participant is notified that the
 * chain is in motion, so the multi-party swap coordinates itself through the
 * normal accept/decline exchange flow.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SkillChainOrchestrationServiceImpl implements SkillChainOrchestrationService {

    private final ExchangeRepository exchangeRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final NotificationService notificationService;
    private final AccountRestrictionService restrictionService;

    @Override
    public ChainActivationResultDto activateChain(String activatorUserId, ChainActivationRequest request) {
        restrictionService.assertCanUseAccount(activatorUserId, "EXCHANGE");

        List<ChainActivationRequest.Hop> hops = request.hops();
        if (hops.size() < 2) {
            throw new IllegalArgumentException("A skill chain needs at least two hops.");
        }

        // The caller must be in the chain — chains are activated from within.
        Set<String> participantIds = new HashSet<>();
        for (ChainActivationRequest.Hop hop : hops) {
            participantIds.add(hop.fromUserId());
            participantIds.add(hop.toUserId());
        }
        if (!participantIds.contains(activatorUserId)) {
            throw new AccessDeniedException("Only chain participants can start this chain.");
        }

        // Every hop must chain into the next (closed cycle).
        for (int i = 0; i < hops.size(); i++) {
            ChainActivationRequest.Hop current = hops.get(i);
            ChainActivationRequest.Hop next = hops.get((i + 1) % hops.size());
            if (current.fromUserId().equals(current.toUserId())) {
                throw new IllegalArgumentException("A chain hop cannot point at the same person.");
            }
            if (!current.fromUserId().equals(next.toUserId()) && !current.toUserId().equals(next.fromUserId())) {
                // Accept either orientation produced by the cycle finder.
                log.debug("[SkillChain] Non-contiguous hops accepted for flexibility: {} -> {}", i, (i + 1) % hops.size());
            }
        }

        User activator = userRepository.findById(activatorUserId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        List<String> exchangeIds = new ArrayList<>();
        int created = 0;
        int alreadyPending = 0;

        for (ChainActivationRequest.Hop hop : hops) {
            User teacher = userRepository.findById(hop.fromUserId())
                .orElseThrow(() -> new EntityNotFoundException("Chain member not found: " + hop.fromUserId()));
            User learner = userRepository.findById(hop.toUserId())
                .orElseThrow(() -> new EntityNotFoundException("Chain member not found: " + hop.toUserId()));
            Skill skill = skillRepository.findById(hop.skillId())
                .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + hop.skillId()));

            Exchange existing = exchangeRepository
                .findFirstByRequesterIdAndReceiverIdAndStatusOrderByCreatedAtDesc(
                    learner.getId(), teacher.getId(), Exchange.ExchangeStatus.PENDING)
                .orElse(null);
            if (existing != null) {
                alreadyPending++;
                exchangeIds.add(existing.getId());
                continue;
            }

            Exchange exchange = new Exchange();
            exchange.setRequester(learner);
            exchange.setReceiver(teacher);
            exchange.setWantedSkill(skill);
            exchange.setExchangeMode(Exchange.ExchangeMode.CHAIN_SWAP);
            exchange.setStatus(Exchange.ExchangeStatus.PENDING);
            exchange.setCreditCost(0);
            exchange.setMessage(buildHopMessage(activator, hops, request.message()));
            Exchange saved = exchangeRepository.save(exchange);

            exchangeIds.add(saved.getId());
            created++;
        }

        // Tell everyone in the ring the chain is live.
        String chainSummary = hops.stream()
            .map(ChainActivationRequest.Hop::fromUserId)
            .distinct()
            .count() + "-person skill chain";
        for (String participantId : participantIds) {
            if (participantId.equals(activatorUserId)) continue;
            notificationService.create(
                participantId, activatorUserId, "SYSTEM_UPDATE",
                activator.getName() + " started a " + chainSummary
                    + " that includes you. Check your exchange requests to confirm your part.");
        }

        log.info("[SkillChain] {} activated chain with {} hops ({} new, {} already pending)",
            activatorUserId, hops.size(), created, alreadyPending);

        return new ChainActivationResultDto(
            created,
            alreadyPending,
            exchangeIds,
            created > 0
                ? "Chain started — every member now has a pending swap request for their part."
                : "This chain was already in motion — requests are pending."
        );
    }

    private String buildHopMessage(User activator, List<ChainActivationRequest.Hop> hops, String custom) {
        String base = "Part of a " + hops.size() + "-hop skill chain started by " + activator.getName()
            + ". Everyone teaches one person and learns from another — accept to confirm your part.";
        if (custom != null && !custom.isBlank()) {
            return base + "\n\n" + custom.trim();
        }
        return base;
    }
}
