package com.skillex.dto.credits;

import java.time.LocalDateTime;

public record CreditTransactionDto(
    String id,
    String userId,
    String counterpartyUserId,
    String counterpartyName,
    String exchangeId,
    int amount,
    String transactionType,
    String reason,
    LocalDateTime createdAt
) {}
