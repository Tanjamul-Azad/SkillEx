package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.connection.ConnectionDto;
import com.skillex.dto.connection.ConnectionRelationshipDto;
import com.skillex.dto.connection.CreateConnectionRequest;
import com.skillex.dto.connection.UpdateConnectionRequest;
import com.skillex.service.ConnectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for user social connections.
 * Base path: /api/connections
 */
@RestController
@RequestMapping("/api/connections")
@RequiredArgsConstructor
public class ConnectionController {

    private final ConnectionService connectionService;

    /** POST /api/connections — send a new connection request */
    @PostMapping
    public ResponseEntity<ApiResponse<ConnectionDto>> create(
        Authentication auth,
        @Valid @RequestBody CreateConnectionRequest req
    ) {
        ConnectionDto dto = connectionService.create(userId(auth), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    /** GET /api/connections?status=&direction=all|sent|received&page=0&size=20 */
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<ConnectionDto>>> list(
        Authentication auth,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "all") String direction,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            connectionService.listForUser(userId(auth), status, direction, page, size)
        ));
    }

    /** GET /api/connections/relationship/{targetUserId} */
    @GetMapping("/relationship/{targetUserId}")
    public ResponseEntity<ApiResponse<ConnectionRelationshipDto>> relationship(
        Authentication auth,
        @PathVariable String targetUserId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            connectionService.getRelationship(userId(auth), targetUserId)
        ));
    }

    /** PATCH /api/connections/{id}/status — accept / decline / cancel */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ConnectionDto>> updateStatus(
        Authentication auth,
        @PathVariable String id,
        @Valid @RequestBody UpdateConnectionRequest req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            connectionService.updateStatus(id, userId(auth), req)
        ));
    }

    /** GET /api/connections/pending-count */
    @GetMapping("/pending-count")
    public ResponseEntity<ApiResponse<Long>> pendingCount(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(connectionService.countIncomingPending(userId(auth))));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
