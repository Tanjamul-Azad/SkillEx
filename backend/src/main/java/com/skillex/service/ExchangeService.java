package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.exchange.*;

/**
 * Contract for exchange (skill-swap request) lifecycle:
 * create → accept/decline → complete/cancel.
 */
public interface ExchangeService {

    ExchangeDto create(String requesterId, CreateExchangeRequest req);

    PagedResponse<ExchangeDto> listForUser(String userId, String status, int page, int size);

    ExchangeDto getById(String exchangeId, String requestingUserId);

    ExchangeDto updateStatus(String exchangeId, String requestingUserId, UpdateExchangeRequest req);

    void cancel(String exchangeId, String requestingUserId);
}
