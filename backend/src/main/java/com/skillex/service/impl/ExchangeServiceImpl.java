package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.exchange.*;
import com.skillex.model.Exchange;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.ExchangeService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ExchangeServiceImpl implements ExchangeService {

    private final ExchangeRepository exchangeRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final DtoMapper mapper;

    @Override
    @Transactional
    public ExchangeDto create(String requesterId, CreateExchangeRequest req) {
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

        Exchange exchange = new Exchange();
        exchange.setRequester(requester);
        exchange.setReceiver(receiver);
        exchange.setOfferedSkill(offeredSkill);
        exchange.setWantedSkill(wantedSkill);
        exchange.setMessage(req.message());
        exchange.setStatus(Exchange.ExchangeStatus.PENDING);
        return mapper.toExchange(exchangeRepository.save(exchange));
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
        assertParticipant(ex, requestingUserId);
        return mapper.toExchange(ex);
    }

    @Override
    @Transactional
    public ExchangeDto updateStatus(String exchangeId, String requestingUserId, UpdateExchangeRequest req) {
        Exchange ex = findExchange(exchangeId);
        assertParticipant(ex, requestingUserId);
        ex.setStatus(Exchange.ExchangeStatus.valueOf(req.status().toUpperCase()));
        return mapper.toExchange(exchangeRepository.save(ex));
    }

    @Override
    @Transactional
    public void cancel(String exchangeId, String requestingUserId) {
        Exchange ex = findExchange(exchangeId);
        assertParticipant(ex, requestingUserId);
        ex.setStatus(Exchange.ExchangeStatus.CANCELLED);
        exchangeRepository.save(ex);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Exchange findExchange(String id) {
        return exchangeRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Exchange not found: " + id));
    }

    private User findUser(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    private void assertParticipant(Exchange ex, String userId) {
        boolean isParticipant = ex.getRequester().getId().equals(userId)
            || ex.getReceiver().getId().equals(userId);
        if (!isParticipant) {
            throw new AccessDeniedException("You are not a participant in this exchange.");
        }
    }
}
