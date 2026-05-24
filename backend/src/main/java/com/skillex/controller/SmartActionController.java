package com.skillex.controller;

import com.skillex.dto.common.ApiResponse;
import com.skillex.dto.dashboard.SmartActionDto;
import com.skillex.service.SmartActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class SmartActionController {
    private final SmartActionService smartActionService;

    @GetMapping("/smart-actions")
    public ResponseEntity<ApiResponse<List<SmartActionDto>>> smartActions(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(smartActionService.actionsFor((String) auth.getPrincipal())));
    }
}
