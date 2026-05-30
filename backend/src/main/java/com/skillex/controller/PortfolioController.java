package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.portfolio.CreatePortfolioProofRequest;
import com.skillex.dto.portfolio.PortfolioProofDto;
import com.skillex.service.PortfolioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping("/api/users/{userId}/portfolio-proofs")
    public ResponseEntity<ApiResponse<PagedResponse<PortfolioProofDto>>> list(
        Authentication auth,
        @PathVariable String userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        String viewerId = auth == null ? null : (String) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(portfolioService.listForUser(viewerId, userId, page, size)));
    }

    @PostMapping("/api/users/me/portfolio-proofs")
    public ResponseEntity<ApiResponse<PortfolioProofDto>> create(
        Authentication auth,
        @Valid @RequestBody CreatePortfolioProofRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(portfolioService.create(userId(auth), request)));
    }

    @DeleteMapping("/api/users/me/portfolio-proofs/{proofId}")
    public ResponseEntity<ApiResponse<String>> delete(Authentication auth, @PathVariable String proofId) {
        portfolioService.delete(userId(auth), proofId);
        return ResponseEntity.ok(ApiResponse.ok("Portfolio proof deleted."));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
