package com.skillex.controller;

import com.skillex.dto.ai.AiHelperRequest;
import com.skillex.dto.ai.AiHelperResponse;
import com.skillex.dto.common.ApiResponse;
import com.skillex.service.ContextualHelpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/helper")
@RequiredArgsConstructor
public class AiHelperController {
    private final ContextualHelpService helpService;

    @PostMapping
    public ResponseEntity<ApiResponse<AiHelperResponse>> respond(
        Authentication auth,
        @Valid @RequestBody AiHelperRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(helpService.respond((String) auth.getPrincipal(), request)));
    }
}
