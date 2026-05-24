package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.credits.AdjustCreditsRequest;
import com.skillex.dto.credits.CreditTransactionDto;
import com.skillex.dto.credits.CreditWalletDto;
import com.skillex.service.CreditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
public class CreditController {
    private final CreditService creditService;

    @GetMapping("/wallet")
    public ApiResponse<CreditWalletDto> wallet(Authentication auth) {
        return ApiResponse.ok(creditService.getWallet(userId(auth)));
    }

    @GetMapping("/transactions")
    public ApiResponse<PagedResponse<CreditTransactionDto>> transactions(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(creditService.getTransactions(userId(auth), page, size));
    }

    @PostMapping("/admin/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CreditWalletDto> adminAdjust(Authentication auth, @Valid @RequestBody AdjustCreditsRequest request) {
        return ApiResponse.ok(creditService.adjustByAdmin(userId(auth), request.userId(), request.amount(), request.reason()));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
