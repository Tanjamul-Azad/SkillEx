package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.credits.CreditTransactionDto;
import com.skillex.dto.credits.CreditWalletDto;
import com.skillex.model.CreditTransaction;
import com.skillex.model.Exchange;

public interface CreditService {
    int DEFAULT_STARTER_CREDITS = 20;
    int STANDARD_SESSION_COST = 10;

    CreditWalletDto getWallet(String userId);
    PagedResponse<CreditTransactionDto> getTransactions(String userId, int page, int size);
    void chargeForCreditExchange(String learnerId, String teacherId, Exchange exchange, int amount);
    void refundCreditExchange(Exchange exchange);
    void rewardSkillCheck(String userId, int amount, String reason);
    void rewardTeachingSession(String teacherId, Exchange exchange, int amount, String reason);
    void rewardCommunityContribution(String userId, int amount, String reason);
    CreditWalletDto adjustByAdmin(String adminUserId, String targetUserId, int amount, String reason);
    CreditTransactionDto toDto(CreditTransaction transaction);
}
