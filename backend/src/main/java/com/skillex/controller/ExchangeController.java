package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.exchange.*;
import com.skillex.service.ExchangeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for skill-swap exchanges.
 * Base path: /api/exchanges
 */
@RestController
@RequestMapping("/api/exchanges")
@RequiredArgsConstructor
public class ExchangeController {

    private final ExchangeService exchangeService;

    /** POST /api/exchanges — send a new exchange request */
    @PostMapping
    public ResponseEntity<ApiResponse<ExchangeDto>> create(
        Authentication auth,
        @Valid @RequestBody CreateExchangeRequest req
    ) {
        ExchangeDto dto = exchangeService.create(userId(auth), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    /** GET /api/exchanges?status=&page=0&size=20 */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ExchangeDto>>> list(
        Authentication auth,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            exchangeService.listForUser(userId(auth), status, page, size)));
    }

    /** GET /api/exchanges/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExchangeDto>> getById(
        Authentication auth,
        @PathVariable String id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(exchangeService.getById(id, userId(auth))));
    }

    /** PATCH /api/exchanges/{id}/status — accept / decline / complete */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ExchangeDto>> updateStatus(
        Authentication auth,
        @PathVariable String id,
        @Valid @RequestBody UpdateExchangeRequest req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            exchangeService.updateStatus(id, userId(auth), req)));
    }

    /** DELETE /api/exchanges/{id} — cancel (soft-delete via status) */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> cancel(
        Authentication auth,
        @PathVariable String id
    ) {
        exchangeService.cancel(id, userId(auth));
        return ResponseEntity.ok(ApiResponse.ok("Exchange cancelled."));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
