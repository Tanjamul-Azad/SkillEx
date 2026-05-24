package com.skillex.dto.credits;

public record CreditWalletDto(
    String userId,
    int balance,
    int lifetimeEarned,
    int lifetimeSpent
) {}
