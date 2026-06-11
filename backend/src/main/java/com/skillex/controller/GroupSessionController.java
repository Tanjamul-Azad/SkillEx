package com.skillex.controller;

import com.skillex.dto.ai.GroupSessionDto;
import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.common.PagedResponse;
import com.skillex.service.GroupSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/group-sessions")
@RequiredArgsConstructor
public class GroupSessionController {
    private final GroupSessionService groupSessionService;

    @PostMapping
    public ApiResponse<GroupSessionDto> create(
        Authentication auth,
        @RequestBody GroupSessionDto.CreateRequest request
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.created(groupSessionService.create(userId, request));
    }

    @PostMapping("/draft")
    public ApiResponse<GroupSessionDto.WorkshopDraft> draft(
        Authentication auth,
        @RequestBody GroupSessionDto.AiDraftRequest request
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.ok(groupSessionService.generateWorkshopDraft(userId, request));
    }

    @PostMapping("/{sessionId}/join")
    public ApiResponse<Void> join(
        Authentication auth,
        @PathVariable String sessionId
    ) {
        String userId = (String) auth.getPrincipal();
        groupSessionService.joinSession(userId, sessionId);
        return ApiResponse.ok(null);
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<GroupSessionDto> get(@PathVariable String sessionId) {
        return ApiResponse.ok(groupSessionService.getSession(sessionId));
    }

    @GetMapping
    public ApiResponse<PagedResponse<GroupSessionDto>> listActive(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<GroupSessionDto> result = groupSessionService.listActive(pageable);
        return ApiResponse.ok(new PagedResponse<>(
            result.getContent(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages(),
            result.isLast()
        ));
    }

    @GetMapping("/user/my-sessions")
    public ApiResponse<PagedResponse<GroupSessionDto>> listUserSessions(
        Authentication auth,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        String userId = (String) auth.getPrincipal();
        Pageable pageable = PageRequest.of(page, size);
        Page<GroupSessionDto> result = groupSessionService.listUserSessions(userId, pageable);
        return ApiResponse.ok(new PagedResponse<>(
            result.getContent(),
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages(),
            result.isLast()
        ));
    }

    @PostMapping("/{sessionId}/leave")
    public ApiResponse<Void> leave(
        Authentication auth,
        @PathVariable String sessionId
    ) {
        String userId = (String) auth.getPrincipal();
        groupSessionService.leaveSession(userId, sessionId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{sessionId}/complete")
    public ApiResponse<Void> complete(
        Authentication auth,
        @PathVariable String sessionId,
        @RequestBody(required = false) CompleteRequest body
    ) {
        String userId = (String) auth.getPrincipal();
        groupSessionService.completeSession(userId, sessionId, body == null ? null : body.notes());
        return ApiResponse.ok(null);
    }

    @PostMapping("/{sessionId}/cancel")
    public ApiResponse<Void> cancel(
        Authentication auth,
        @PathVariable String sessionId
    ) {
        String userId = (String) auth.getPrincipal();
        groupSessionService.cancelSession(userId, sessionId);
        return ApiResponse.ok(null);
    }

    public record CompleteRequest(String notes) {}

    @PostMapping("/{sessionId}/certificate")
    public ApiResponse<GroupSessionDto.GroupCertificate> generateCertificate(
        Authentication auth,
        @PathVariable String sessionId
    ) {
        String userId = (String) auth.getPrincipal();
        return ApiResponse.ok(groupSessionService.generateCertificate(sessionId, userId));
    }
}
