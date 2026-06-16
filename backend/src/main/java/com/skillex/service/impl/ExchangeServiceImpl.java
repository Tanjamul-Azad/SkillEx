package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.exchange.*;
import com.skillex.model.Exchange;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.repository.ConnectionRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.ExchangeService;
import com.skillex.service.NotificationService;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.CreditService;
import com.skillex.service.SkillTrustService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class ExchangeServiceImpl implements ExchangeService {

    private final ExchangeRepository exchangeRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final ConnectionRepository connectionRepository;
    private final DtoMapper mapper;
    private final NotificationService notificationService;
    private final AccountRestrictionService restrictionService;
    private final CreditService creditService;
    private final SkillTrustService skillTrustService;

    @Override
    @Transactional
    public ExchangeDto create(String requesterId, CreateExchangeRequest req) {
        restrictionService.assertCanUseAccount(requesterId, "EXCHANGE");
        User requester = findUser(requesterId);
        User receiver  = findUser(req.receiverId());

        if (requester.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("You cannot create an exchange request with yourself.");
        }

        Exchange existingPending = exchangeRepository
            .findFirstByRequesterIdAndReceiverIdAndStatusOrderByCreatedAtDesc(
                requester.getId(), receiver.getId(), Exchange.ExchangeStatus.PENDING)
            .orElse(null);
        if (existingPending != null) {
            return mapper.toExchange(existingPending);
        }

        Skill offeredSkill = (req.offeredSkillId() != null)
            ? skillRepository.findById(req.offeredSkillId())
                .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + req.offeredSkillId()))
            : null;
        Skill wantedSkill = (req.wantedSkillId() != null)
            ? skillRepository.findById(req.wantedSkillId())
                .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + req.wantedSkillId()))
            : null;
        Exchange.ExchangeMode mode = parseMode(req.mode(), offeredSkill, wantedSkill);
        int creditCost = calculateCreditCost(receiver.getId(), wantedSkill, mode);

        Exchange exchange = new Exchange();
        exchange.setRequester(requester);
        exchange.setReceiver(receiver);
        exchange.setOfferedSkill(offeredSkill);
        exchange.setWantedSkill(wantedSkill);
        exchange.setMessage(req.message());
        exchange.setExchangeMode(mode);
        exchange.setCreditCost(creditCost);
        exchange.setStatus(Exchange.ExchangeStatus.PENDING);
        Exchange saved = exchangeRepository.save(exchange);

        if (mode == Exchange.ExchangeMode.CREDIT_PAYMENT) {
            creditService.chargeForCreditExchange(requester.getId(), receiver.getId(), saved, creditCost);
        }

        notificationService.create(
            receiver.getId(),
            requester.getId(),
            "MATCH_REQUEST",
            requester.getName() + " sent you a skill exchange request.",
            "EXCHANGE",
            saved.getId(),
            "/dashboard?panel=requests&requestsTab=received#exchange-requests"
        );

        return mapper.toExchange(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ExchangeDto> listForUser(String userId, String status, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var pageResult = (status == null || status.isBlank())
            ? exchangeRepository.findByRequesterIdOrReceiverId(userId, userId, pageable)
            : exchangeRepository.findByRequesterIdOrReceiverIdAndStatus(
                userId, userId,
                Exchange.ExchangeStatus.valueOf(status.toUpperCase()),
                pageable);
        return PagedResponse.of(pageResult.map(mapper::toExchange));
    }

    @Override
    @Transactional(readOnly = true)
    public ExchangeDto getById(String exchangeId, String requestingUserId) {
        Exchange ex = findExchange(exchangeId);
        assertParticipant(isRequester(ex, requestingUserId), isReceiver(ex, requestingUserId));
        return mapper.toExchange(ex);
    }

    @Override
    @Transactional
    public ExchangeDto updateStatus(String exchangeId, String requestingUserId, UpdateExchangeRequest req) {
        Exchange ex = findExchange(exchangeId);
        boolean requester = isRequester(ex, requestingUserId);
        boolean receiver = isReceiver(ex, requestingUserId);
        assertParticipant(requester, receiver);

        Exchange.ExchangeStatus current = ex.getStatus();
        Exchange.ExchangeStatus next = parseStatus(req.status());
        if (ex.getStatus() == next) {
            return mapper.toExchange(ex);
        }

        if (next == Exchange.ExchangeStatus.ACCEPTED || next == Exchange.ExchangeStatus.DECLINED) {
            if (!receiver) {
                throw new AccessDeniedException("Only the request receiver can accept or decline an exchange.");
            }
            if (current != Exchange.ExchangeStatus.PENDING) {
                throw new IllegalStateException("Only pending exchanges can be accepted or declined.");
            }
        }

        if (next == Exchange.ExchangeStatus.CANCELLED) {
            if (current != Exchange.ExchangeStatus.PENDING && current != Exchange.ExchangeStatus.ACCEPTED) {
                throw new IllegalStateException("Only pending or accepted exchanges can be cancelled.");
            }
        }

        if (next == Exchange.ExchangeStatus.COMPLETED && current != Exchange.ExchangeStatus.ACCEPTED) {
            throw new IllegalStateException("Only accepted exchanges can be completed.");
        }

        ex.setStatus(next);
        Exchange saved = exchangeRepository.save(ex);

        if (next == Exchange.ExchangeStatus.ACCEPTED) {
            notificationService.create(
                saved.getRequester().getId(),
                saved.getReceiver().getId(),
                "MATCH_REQUEST",
                saved.getReceiver().getName() + " accepted your skill exchange request.",
                "EXCHANGE",
                saved.getId(),
                "/dashboard?panel=requests&requestsTab=sent#exchange-requests"
            );

            // Symmetrically auto-create or accept Connection
            try {
                com.skillex.model.Connection existingConn = connectionRepository.findPairHistory(
                    saved.getRequester().getId(),
                    saved.getReceiver().getId(),
                    PageRequest.of(0, 1)
                ).stream().findFirst().orElse(null);

                if (existingConn == null) {
                    com.skillex.model.Connection newConn = new com.skillex.model.Connection();
                    newConn.setRequester(saved.getRequester());
                    newConn.setReceiver(saved.getReceiver());
                    newConn.setStatus(com.skillex.model.Connection.ConnectionStatus.ACCEPTED);
                    newConn.setRespondedAt(java.time.LocalDateTime.now());
                    connectionRepository.save(newConn);
                } else if (existingConn.getStatus() == com.skillex.model.Connection.ConnectionStatus.PENDING) {
                    existingConn.setStatus(com.skillex.model.Connection.ConnectionStatus.ACCEPTED);
                    existingConn.setRespondedAt(java.time.LocalDateTime.now());
                    connectionRepository.save(existingConn);
                }
            } catch (Exception e) {
                // Auto-connection is a non-critical convenience; the exchange acceptance still
                // stands, but log so the failure is visible instead of silently swallowed.
                log.warn("Auto-connection sync failed for exchange {}: {}", saved.getId(), e.getMessage());
            }
        } else if (next == Exchange.ExchangeStatus.DECLINED) {
            if (saved.getExchangeMode() == Exchange.ExchangeMode.CREDIT_PAYMENT) {
                creditService.refundCreditExchange(saved);
            }
            notificationService.create(
                saved.getRequester().getId(),
                saved.getReceiver().getId(),
                "MATCH_REQUEST",
                saved.getReceiver().getName() + " declined your skill exchange request.",
                "EXCHANGE",
                saved.getId(),
                "/dashboard?panel=requests&requestsTab=sent#exchange-requests"
            );
        } else if (next == Exchange.ExchangeStatus.CANCELLED) {
            // Mirror cancel(): a credit-funded request must be refunded however it is cancelled.
            if (saved.getExchangeMode() == Exchange.ExchangeMode.CREDIT_PAYMENT) {
                creditService.refundCreditExchange(saved);
            }
        }

        return mapper.toExchange(saved);
    }

    @Override
    @Transactional
    public void cancel(String exchangeId, String requestingUserId) {
        Exchange ex = findExchange(exchangeId);
        boolean requester = isRequester(ex, requestingUserId);
        boolean receiver = isReceiver(ex, requestingUserId);
        assertParticipant(requester, receiver);
        Exchange.ExchangeStatus current = ex.getStatus();
        if (current == Exchange.ExchangeStatus.CANCELLED) {
            return;
        }
        if (current == Exchange.ExchangeStatus.DECLINED || current == Exchange.ExchangeStatus.COMPLETED) {
            throw new IllegalStateException("This exchange can no longer be cancelled.");
        }
        ex.setStatus(Exchange.ExchangeStatus.CANCELLED);
        Exchange saved = exchangeRepository.save(ex);
        if (saved.getExchangeMode() == Exchange.ExchangeMode.CREDIT_PAYMENT) {
            creditService.refundCreditExchange(saved);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ExchangeRelationshipDto getRelationship(String userId, String targetUserId) {
        if (userId.equals(targetUserId)) {
            return new ExchangeRelationshipDto(targetUserId, "NONE", null);
        }

        var history = exchangeRepository.findPairHistory(
            userId,
            targetUserId,
            PageRequest.of(0, 10)
        );
        Exchange latest = history.stream().findFirst().orElse(null);

        if (latest == null) {
            return new ExchangeRelationshipDto(targetUserId, "NONE", null);
        }

        return switch (latest.getStatus()) {
            case ACCEPTED -> new ExchangeRelationshipDto(targetUserId, "ACCEPTED", latest.getId());
            case PENDING -> {
                String status = latest.getRequester().getId().equals(userId)
                    ? "PENDING_SENT"
                    : "PENDING_RECEIVED";
                yield new ExchangeRelationshipDto(targetUserId, status, latest.getId());
            }
            case DECLINED -> new ExchangeRelationshipDto(targetUserId, "DECLINED", latest.getId());
            case COMPLETED -> new ExchangeRelationshipDto(targetUserId, "COMPLETED", latest.getId());
            case CANCELLED -> new ExchangeRelationshipDto(targetUserId, "CANCELLED", latest.getId());
        };
    }

    // helpers

    private Exchange findExchange(String id) {
        return exchangeRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Exchange not found: " + id));
    }

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    private Exchange.ExchangeMode parseMode(String requestedMode, Skill offeredSkill, Skill wantedSkill) {
        if (requestedMode != null && !requestedMode.isBlank()) {
            try {
                return Exchange.ExchangeMode.valueOf(requestedMode.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Invalid exchange mode: " + requestedMode);
            }
        }
        if (offeredSkill == null && wantedSkill != null) {
            return Exchange.ExchangeMode.CREDIT_PAYMENT;
        }
        return Exchange.ExchangeMode.DIRECT_SWAP;
    }

    private int calculateCreditCost(String teacherId, Skill wantedSkill, Exchange.ExchangeMode mode) {
        if (mode != Exchange.ExchangeMode.CREDIT_PAYMENT) {
            return 0;
        }
        if (wantedSkill == null) {
            return CreditService.STANDARD_SESSION_COST;
        }
        int trustScore = skillTrustService.getTrust(teacherId, wantedSkill.getId()).score();
        return trustScore >= 80 ? 15 : CreditService.STANDARD_SESSION_COST;
    }

    private Exchange.ExchangeStatus parseStatus(String status) {
        try {
            return Exchange.ExchangeStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid exchange status: " + status);
        }
    }

    private boolean isRequester(Exchange ex, String userId) {
        return ex.getRequester().getId().equals(userId);
    }

    private boolean isReceiver(Exchange ex, String userId) {
        return ex.getReceiver().getId().equals(userId);
    }

    private void assertParticipant(boolean requester, boolean receiver) {
        if (!requester && !receiver) {
            throw new AccessDeniedException("You are not a participant in this exchange.");
        }
    }
}
