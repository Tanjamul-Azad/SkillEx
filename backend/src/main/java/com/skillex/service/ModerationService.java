package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.moderation.*;
import com.skillex.model.*;
import com.skillex.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ModerationService {
    private final ContentReportRepository reportRepository;
    private final ModerationCaseRepository caseRepository;
    private final ModerationActionRepository actionRepository;
    private final UserRestrictionRepository restrictionRepository;
    private final UserRepository userRepository;
    private final AdminAuditLogRepository auditRepository;
    private final ModerationAiAssistService aiAssistService;
    private final CertificateService certificateService;

    @Transactional
    public ReportDto createReport(String reporterUserId, CreateReportRequest req) {
        User reporter = findUser(reporterUserId);
        User targetUser = req.targetUserId() == null || req.targetUserId().isBlank()
            ? null
            : userRepository.findById(req.targetUserId()).orElse(null);

        ContentReport report = ContentReport.builder()
            .reporter(reporter)
            .targetType(ContentReport.TargetType.valueOf(req.targetType().toUpperCase()))
            .targetId(req.targetId())
            .targetUser(targetUser)
            .category(req.category())
            .reason(req.reason())
            .evidence(req.evidence())
            .status(ModerationStatus.OPEN)
            .build();
        ContentReport saved = reportRepository.save(report);

        var suggestion = aiAssistService.suggest(saved);
        ModerationCase moderationCase = ModerationCase.builder()
            .report(saved)
            .targetUser(targetUser)
            .title(req.category() + " report on " + req.targetType())
            .summary(req.reason())
            .severity(suggestion.severity())
            .status(ModerationStatus.OPEN)
            .aiSummary(suggestion.summary())
            .aiRecommendedAction(suggestion.actionType().name())
            .build();
        caseRepository.save(moderationCase);
        return toReportDto(saved);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReportDto> listReports(String status, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = status == null || status.isBlank()
            ? reportRepository.findAllByOrderByCreatedAtDesc(pageable)
            : reportRepository.findByStatusOrderByCreatedAtDesc(ModerationStatus.valueOf(status.toUpperCase()), pageable);
        return PagedResponse.of(result.map(this::toReportDto));
    }

    @Transactional(readOnly = true)
    public PagedResponse<ModerationCaseDto> listCases(String status, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        var result = status == null || status.isBlank()
            ? caseRepository.findAllByOrderByUpdatedAtDesc(pageable)
            : caseRepository.findByStatusOrderByUpdatedAtDesc(ModerationStatus.valueOf(status.toUpperCase()), pageable);
        return PagedResponse.of(result.map(this::toCaseDto));
    }

    @Transactional(readOnly = true)
    public ModerationCaseDto getCase(String caseId) {
        return toCaseDto(findCase(caseId));
    }

    @Transactional
    public ModerationActionDto applyAction(String adminUserId, CreateModerationActionRequest req) {
        User admin = findUser(adminUserId);
        ModerationCase moderationCase = req.caseId() == null || req.caseId().isBlank()
            ? null
            : findCase(req.caseId());
        User targetUser = req.targetUserId() == null || req.targetUserId().isBlank()
            ? (moderationCase != null ? moderationCase.getTargetUser() : null)
            : userRepository.findById(req.targetUserId()).orElse(null);

        ModerationActionType actionType = ModerationActionType.valueOf(req.actionType().toUpperCase());
        ModerationSeverity severity = req.severity() == null || req.severity().isBlank()
            ? (moderationCase != null ? moderationCase.getSeverity() : ModerationSeverity.LOW)
            : ModerationSeverity.valueOf(req.severity().toUpperCase());

        ModerationAction action = ModerationAction.builder()
            .moderationCase(moderationCase)
            .admin(admin)
            .targetUser(targetUser)
            .targetType(req.targetType())
            .targetId(req.targetId())
            .actionType(actionType)
            .severity(severity)
            .reason(req.reason())
            .evidence(req.evidence())
            .durationHours(req.durationHours())
            .build();
        ModerationAction saved = actionRepository.save(action);

        if (targetUser != null) {
            createRestrictionIfNeeded(targetUser, saved, actionType, req.reason(), req.durationHours());
        }

        if (moderationCase != null) {
            moderationCase.setStatus(ModerationStatus.RESOLVED);
            moderationCase.setClosedAt(LocalDateTime.now());
            caseRepository.save(moderationCase);
            if (moderationCase.getReport() != null) {
                moderationCase.getReport().setStatus(ModerationStatus.RESOLVED);
                moderationCase.getReport().setResolvedAt(LocalDateTime.now());
                reportRepository.save(moderationCase.getReport());
            }
        }

        auditRepository.save(AdminAuditLog.builder()
            .admin(admin)
            .action("MODERATION_" + actionType.name())
            .entityType("MODERATION_ACTION")
            .entityId(saved.getId())
            .details(req.reason())
            .build());

        return toActionDto(saved);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ModerationActionDto> listUserActions(String userId, int page, int size) {
        return PagedResponse.of(actionRepository
            .findByTargetUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
            .map(this::toActionDto));
    }

    private void createRestrictionIfNeeded(User user, ModerationAction action, ModerationActionType type, String reason, Integer durationHours) {
        UserRestriction.RestrictionType restrictionType = switch (type) {
            case WARN -> UserRestriction.RestrictionType.WARN;
            case RESTRICT_POSTING -> UserRestriction.RestrictionType.RESTRICT_POSTING;
            case RESTRICT_MESSAGING -> UserRestriction.RestrictionType.RESTRICT_MESSAGING;
            case SUSPEND_ACCOUNT -> UserRestriction.RestrictionType.SUSPEND_ACCOUNT;
            case BAN_ACCOUNT -> UserRestriction.RestrictionType.BAN_ACCOUNT;
            default -> null;
        };
        if (restrictionType == null) return;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endsAt = restrictionType == UserRestriction.RestrictionType.BAN_ACCOUNT
            ? null
            : now.plusHours(durationHours != null && durationHours > 0 ? durationHours : defaultHours(restrictionType));
        restrictionRepository.save(UserRestriction.builder()
            .user(user)
            .action(action)
            .restrictionType(restrictionType)
            .reason(reason)
            .status(UserRestriction.RestrictionStatus.ACTIVE)
            .startsAt(now)
            .endsAt(endsAt)
            .build());
        if (restrictionType == UserRestriction.RestrictionType.SUSPEND_ACCOUNT
            || restrictionType == UserRestriction.RestrictionType.BAN_ACCOUNT
            || restrictionType == UserRestriction.RestrictionType.RESTRICT_POSTING
            || restrictionType == UserRestriction.RestrictionType.RESTRICT_MESSAGING) {
            certificateService.revokeUnsafeCredentials(user.getId(), "Credential revoked after moderation action: " + restrictionType.name());
        }
    }

    private int defaultHours(UserRestriction.RestrictionType type) {
        return switch (type) {
            case WARN -> 24;
            case RESTRICT_POSTING, RESTRICT_MESSAGING -> 72;
            case SUSPEND_ACCOUNT -> 168;
            case BAN_ACCOUNT -> 0;
        };
    }

    private User findUser(String id) {
        return userRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
    }

    private ModerationCase findCase(String id) {
        return caseRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Moderation case not found: " + id));
    }

    private ReportDto toReportDto(ContentReport r) {
        return new ReportDto(
            r.getId(),
            r.getReporter().getId(),
            r.getReporter().getName(),
            r.getTargetType().name(),
            r.getTargetId(),
            r.getTargetUser() != null ? r.getTargetUser().getId() : null,
            r.getTargetUser() != null ? r.getTargetUser().getName() : null,
            r.getCategory(),
            r.getReason(),
            r.getEvidence(),
            r.getStatus().name(),
            r.getCreatedAt(),
            r.getResolvedAt()
        );
    }

    private ModerationCaseDto toCaseDto(ModerationCase c) {
        return new ModerationCaseDto(
            c.getId(),
            c.getReport() != null ? c.getReport().getId() : null,
            c.getTargetUser() != null ? c.getTargetUser().getId() : null,
            c.getTargetUser() != null ? c.getTargetUser().getName() : null,
            c.getTitle(),
            c.getSummary(),
            c.getSeverity().name(),
            c.getStatus().name(),
            c.getAiSummary(),
            c.getAiRecommendedAction(),
            c.getCreatedAt(),
            c.getUpdatedAt(),
            c.getClosedAt()
        );
    }

    private ModerationActionDto toActionDto(ModerationAction a) {
        return new ModerationActionDto(
            a.getId(),
            a.getModerationCase() != null ? a.getModerationCase().getId() : null,
            a.getAdmin().getId(),
            a.getAdmin().getName(),
            a.getTargetUser() != null ? a.getTargetUser().getId() : null,
            a.getTargetUser() != null ? a.getTargetUser().getName() : null,
            a.getTargetType(),
            a.getTargetId(),
            a.getActionType().name(),
            a.getSeverity().name(),
            a.getReason(),
            a.getEvidence(),
            a.getDurationHours(),
            a.getCreatedAt()
        );
    }
}
