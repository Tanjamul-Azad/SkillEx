package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.portfolio.CreatePortfolioProofRequest;
import com.skillex.dto.portfolio.PortfolioProofDto;

public interface PortfolioService {
    PagedResponse<PortfolioProofDto> listForUser(String viewerUserId, String targetUserId, int page, int size);

    PortfolioProofDto create(String userId, CreatePortfolioProofRequest request);

    void delete(String userId, String proofId);
}
