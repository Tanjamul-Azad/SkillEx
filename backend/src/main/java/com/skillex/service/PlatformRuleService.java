package com.skillex.service;

import com.skillex.dto.admin.PlatformRuleDto;
import com.skillex.dto.admin.UpsertPlatformRuleRequest;
import com.skillex.model.AdminAuditLog;
import com.skillex.model.ModerationActionType;
import com.skillex.model.ModerationSeverity;
import com.skillex.model.PlatformRule;
import com.skillex.repository.AdminAuditLogRepository;
import com.skillex.repository.PlatformRuleRepository;
import com.skillex.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlatformRuleService {
    private final PlatformRuleRepository ruleRepository;
    private final UserRepository userRepository;
    private final AdminAuditLogRepository auditRepository;

    @Transactional(readOnly = true)
    public List<PlatformRuleDto> list() {
        return ruleRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public PlatformRuleDto create(String adminUserId, UpsertPlatformRuleRequest req) {
        PlatformRule rule = PlatformRule.builder()
            .code(req.code().trim().toUpperCase())
            .title(req.title())
            .description(req.description())
            .category(req.category())
            .severity(ModerationSeverity.valueOf(valueOr(req.severity(), "LOW")))
            .defaultAction(ModerationActionType.valueOf(valueOr(req.defaultAction(), "WARN")))
            .active(req.active() == null || req.active())
            .build();
        PlatformRule saved = ruleRepository.save(rule);
        audit(adminUserId, "RULE_CREATED", saved.getId(), saved.getCode());
        return toDto(saved);
    }

    @Transactional
    public PlatformRuleDto update(String adminUserId, String id, UpsertPlatformRuleRequest req) {
        PlatformRule rule = ruleRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        rule.setCode(req.code().trim().toUpperCase());
        rule.setTitle(req.title());
        rule.setDescription(req.description());
        rule.setCategory(req.category());
        rule.setSeverity(ModerationSeverity.valueOf(valueOr(req.severity(), "LOW")));
        rule.setDefaultAction(ModerationActionType.valueOf(valueOr(req.defaultAction(), "WARN")));
        if (req.active() != null) rule.setActive(req.active());
        PlatformRule saved = ruleRepository.save(rule);
        audit(adminUserId, "RULE_UPDATED", saved.getId(), saved.getCode());
        return toDto(saved);
    }

    private void audit(String adminUserId, String action, String entityId, String details) {
        userRepository.findById(adminUserId).ifPresent(admin -> auditRepository.save(AdminAuditLog.builder()
            .admin(admin)
            .action(action)
            .entityType("PLATFORM_RULE")
            .entityId(entityId)
            .details(details)
            .build()));
    }

    private String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.toUpperCase();
    }

    private PlatformRuleDto toDto(PlatformRule r) {
        return new PlatformRuleDto(
            r.getId(),
            r.getCode(),
            r.getTitle(),
            r.getDescription(),
            r.getCategory(),
            r.getSeverity().name(),
            r.getDefaultAction().name(),
            Boolean.TRUE.equals(r.getActive()),
            r.getCreatedAt(),
            r.getUpdatedAt()
        );
    }
}
