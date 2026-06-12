package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.notification.NotificationDto;
import com.skillex.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for user notifications.
 * Base path: /api/notifications
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<NotificationDto>>> list(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            notificationService.getForUser(userId(auth), page, size)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDto>> markRead(
        Authentication auth,
        @PathVariable String id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            notificationService.markRead(id, userId(auth))));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDto>> markReadPut(
        Authentication auth,
        @PathVariable String id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            notificationService.markRead(id, userId(auth))));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<String>> markAllRead(Authentication auth) {
        notificationService.markAllRead(userId(auth));
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read."));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<String>> markAllReadPut(Authentication auth) {
        notificationService.markAllRead(userId(auth));
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read."));
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
