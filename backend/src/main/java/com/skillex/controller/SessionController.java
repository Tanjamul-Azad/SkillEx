package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.session.*;
import com.skillex.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for skill-swap sessions.
 * Base path: /api/sessions
 */
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    /** GET /api/sessions?page=0&size=20 — sessions for authenticated user */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<SessionDto>>> list(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            sessionService.getSessionsForUser(userId(auth), page, size)));
    }

    /** GET /api/sessions/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SessionDto>> getById(
        Authentication auth,
        @PathVariable String id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(sessionService.getById(id, userId(auth))));
    }

    /** POST /api/sessions — schedule a new session */
    @PostMapping
    public ResponseEntity<ApiResponse<SessionDto>> create(
        Authentication auth,
        @Valid @RequestBody CreateSessionRequest req
    ) {
        SessionDto dto = sessionService.create(userId(auth), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    /** PATCH /api/sessions/{id}/complete */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<SessionDto>> complete(
        Authentication auth,
        @PathVariable String id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(sessionService.markCompleted(id, userId(auth))));
    }

    /** PATCH /api/sessions/{id}/cancel */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<SessionDto>> cancel(
        Authentication auth,
        @PathVariable String id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(sessionService.markCancelled(id, userId(auth))));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
