package com.skillex.service;

import com.skillex.dto.admin.AdminAuditLogDto;
import com.skillex.dto.admin.AdminOverviewDto;
import com.skillex.dto.common.PagedResponse;
import com.skillex.model.ModerationStatus;
import com.skillex.model.Session;
import com.skillex.model.UserRestriction;
import com.skillex.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final ContentReportRepository reportRepository;
    private final ModerationCaseRepository caseRepository;
    private final UserRestrictionRepository restrictionRepository;
    private final PendingSkillRepository pendingSkillRepository;
    private final PlatformRuleRepository ruleRepository;
    private final AdminAuditLogRepository auditRepository;

    @Transactional(readOnly = true)
    public AdminOverviewDto overview() {
        return new AdminOverviewDto(
            userRepository.count(),
            sessionRepository.countByStatus(Session.SessionStatus.COMPLETED),
            reportRepository.count(),
            reportRepository.countByStatus(ModerationStatus.OPEN),
            caseRepository.countByStatus(ModerationStatus.OPEN),
            restrictionRepository.countByStatus(UserRestriction.RestrictionStatus.ACTIVE),
            pendingSkillRepository.countByStatus(com.skillex.model.PendingSkill.Status.PENDING),
            ruleRepository.findByActiveTrueOrderBySeverityDescTitleAsc().size()
        );
    }

    @Transactional(readOnly = true)
    public PagedResponse<AdminAuditLogDto> auditLogs(int page, int size) {
        return PagedResponse.of(auditRepository
            .findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
            .map(log -> new AdminAuditLogDto(
                log.getId(),
                log.getAdmin().getId(),
                log.getAdmin().getName(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getDetails(),
                log.getCreatedAt()
            )));
    }
}
