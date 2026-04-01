package com.skillex.service;

import com.skillex.dto.skill.ApprovePendingSkillRequest;
import com.skillex.dto.skill.RejectPendingSkillRequest;
import com.skillex.dto.user.AddSkillRequest;
import com.skillex.dto.user.AddSkillResult;
import com.skillex.model.PendingSkill;
import com.skillex.model.PendingSkillSuggestion;
import com.skillex.model.Skill;
import com.skillex.model.SkillCatalogAudit;
import com.skillex.repository.PendingSkillRepository;
import com.skillex.repository.PendingSkillSuggestionRepository;
import com.skillex.repository.SkillCatalogAuditRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.service.embedding.SkillEmbeddingSyncService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class SkillCatalogGovernanceService {

    private final PendingSkillRepository pendingSkillRepository;
    private final PendingSkillSuggestionRepository pendingSkillSuggestionRepository;
    private final SkillCatalogAuditRepository skillCatalogAuditRepository;
    private final SkillRepository skillRepository;
    private final SkillEmbeddingSyncService skillEmbeddingSyncService;

    @Value("${app.catalog.pipeline.auto-promote-enabled:true}")
    private boolean autoPromoteEnabled;

    @Value("${app.catalog.pipeline.auto-promote-min-occurrences:3}")
    private int autoPromoteMinOccurrences;

    @Value("${app.catalog.pipeline.pending-list-default-limit:50}")
    private int pendingListDefaultLimit;

    @Transactional
    public AddSkillResult submitUnknownSkill(String userId, AddSkillRequest req) {
        String displayName = sanitizeDisplayName(req.skillName());
        String normalizedName = normalizeName(displayName);

        PendingSkill pending = pendingSkillRepository.findByNormalizedName(normalizedName)
            .map(existing -> updatePending(existing, req, userId))
            .orElseGet(() -> createPending(displayName, normalizedName, req, userId));

        recordSuggestionIfNeeded(pending.getId(), userId);

        if (autoPromoteEnabled && pending.getStatus() == PendingSkill.Status.PENDING && shouldAutoPromote(pending)) {
            Skill promoted = promoteToCatalog(pending,
                req.skillCategory() == null || req.skillCategory().isBlank() ? "Other" : req.skillCategory(),
                req.skillDescription(),
                "Zap",
                PendingSkill.Status.AUTO_PROMOTED,
                userId,
                "Auto-promoted by distinct user suggestion threshold"
            );
            return new AddSkillResult("ADDED", "Skill auto-promoted and added to catalog.", promoted.getId(), pending.getId());
        }

        return new AddSkillResult("PENDING", "Skill submitted for catalog review.", null, pending.getId());
    }

    @Transactional(readOnly = true)
    public List<PendingSkill> listPending(String status, Integer limit) {
        PendingSkill.Status parsedStatus = null;
        if (status != null && !status.isBlank()) {
            parsedStatus = PendingSkill.Status.valueOf(status.toUpperCase(Locale.ROOT));
        }

        int resolvedLimit = limit == null || limit <= 0
            ? pendingListDefaultLimit
            : Math.min(limit, 200);

        return pendingSkillRepository.findByStatusOrderByLastSeen(parsedStatus, PageRequest.of(0, resolvedLimit));
    }

    @Transactional
    public Skill approve(String pendingId, String adminUserId, ApprovePendingSkillRequest req) {
        PendingSkill pending = pendingSkillRepository.findById(pendingId)
            .orElseThrow(() -> new EntityNotFoundException("Pending skill not found: " + pendingId));

        return promoteToCatalog(
            pending,
            req.category(),
            req.description(),
            req.icon(),
            PendingSkill.Status.APPROVED,
            adminUserId,
            req.reviewNote()
        );
    }

    @Transactional
    public PendingSkill reject(String pendingId, String adminUserId, RejectPendingSkillRequest req) {
        PendingSkill pending = pendingSkillRepository.findById(pendingId)
            .orElseThrow(() -> new EntityNotFoundException("Pending skill not found: " + pendingId));

        pending.setStatus(PendingSkill.Status.REJECTED);
        pending.setReviewedByUserId(adminUserId);
        pending.setReviewedAt(LocalDateTime.now());
        pending.setReviewNote(req.reviewNote());
        pending = pendingSkillRepository.save(pending);

        audit(SkillCatalogAudit.Action.REJECTED, pending.getId(), null, adminUserId, req.reviewNote());
        return pending;
    }

    @Transactional
    public void deletePending(String pendingId, String adminUserId) {
        PendingSkill pending = pendingSkillRepository.findById(pendingId)
            .orElseThrow(() -> new EntityNotFoundException("Pending skill not found: " + pendingId));

        audit(SkillCatalogAudit.Action.REJECTED, pending.getId(), pending.getPromotedSkillId(), adminUserId,
            "Deleted from pending queue by admin");
        pendingSkillRepository.delete(pending);
    }

    @Transactional
    public int autoPromoteEligiblePendingSkills() {
        if (!autoPromoteEnabled) {
            return 0;
        }

        List<PendingSkill> pendingSkills = pendingSkillRepository.findByStatus(PendingSkill.Status.PENDING);
        int promoted = 0;

        for (PendingSkill pending : pendingSkills) {
            if (!shouldAutoPromote(pending)) {
                continue;
            }

            String actorUserId = pending.getRequestedByUserId();
            promoteToCatalog(
                pending,
                pending.getCategory(),
                pending.getDescription(),
                "Zap",
                PendingSkill.Status.AUTO_PROMOTED,
                actorUserId,
                "Auto-promoted by distinct user suggestion threshold"
            );
            promoted++;
        }

        if (promoted > 0) {
            log.info("[SkillGovernance] Auto-promoted {} pending skills.", promoted);
        }
        return promoted;
    }

    private PendingSkill updatePending(PendingSkill pending, AddSkillRequest req, String userId) {
        pending.setSeenCount(pending.getSeenCount() + 1);
        if (req.matchConfidence() != null) {
            pending.setConfidenceSum(pending.getConfidenceSum() + req.matchConfidence());
        }
        pending.setLastSeenAt(LocalDateTime.now());
        pending.setRequestedByUserId(userId);

        if ((pending.getCategory() == null || pending.getCategory().isBlank())
            && req.skillCategory() != null && !req.skillCategory().isBlank()) {
            pending.setCategory(req.skillCategory());
        }
        if ((pending.getDescription() == null || pending.getDescription().isBlank())
            && req.skillDescription() != null && !req.skillDescription().isBlank()) {
            pending.setDescription(req.skillDescription());
        }
        if ((pending.getSourceIntent() == null || pending.getSourceIntent().isBlank())
            && req.sourceIntent() != null && !req.sourceIntent().isBlank()) {
            pending.setSourceIntent(req.sourceIntent());
        }

        PendingSkill saved = pendingSkillRepository.save(pending);
        audit(SkillCatalogAudit.Action.UPDATED, saved.getId(), saved.getPromotedSkillId(), userId,
            "seenCount=" + saved.getSeenCount());
        return saved;
    }

    private PendingSkill createPending(String displayName, String normalizedName, AddSkillRequest req, String userId) {
        PendingSkill pending = PendingSkill.builder()
            .displayName(displayName)
            .normalizedName(normalizedName)
            .category(req.skillCategory())
            .description(req.skillDescription())
            .sourceIntent(req.sourceIntent())
            .requestedByUserId(userId)
            .seenCount(1)
            .confidenceSum(req.matchConfidence() == null ? 0.0 : req.matchConfidence())
            .firstSeenAt(LocalDateTime.now())
            .lastSeenAt(LocalDateTime.now())
            .status(PendingSkill.Status.PENDING)
            .build();

        pending = pendingSkillRepository.save(pending);
        audit(SkillCatalogAudit.Action.SUBMITTED, pending.getId(), null, userId, "New pending skill submitted");
        return pending;
    }

    private boolean shouldAutoPromote(PendingSkill pending) {
        long distinctUserCount = pendingSkillSuggestionRepository.countByPendingSkillId(pending.getId());
        if (distinctUserCount < autoPromoteMinOccurrences) {
            return false;
        }
        return true;
    }

    private Skill promoteToCatalog(PendingSkill pending,
                                   String category,
                                   String description,
                                   String icon,
                                   PendingSkill.Status status,
                                   String actorUserId,
                                   String reviewNote) {
        Optional<Skill> existing = skillRepository.findByNameIgnoreCase(pending.getDisplayName());
        Skill skill = existing.orElseGet(() -> {
            Skill created = new Skill();
            created.setName(pending.getDisplayName());
            created.setCategory((category == null || category.isBlank()) ? "Other" : category);
            created.setDescription(description == null || description.isBlank()
                ? "Promoted from pending skill queue"
                : description);
            created.setIcon((icon == null || icon.isBlank()) ? "Zap" : icon);
            return skillRepository.save(created);
        });

        pending.setStatus(status);
        pending.setPromotedSkillId(skill.getId());
        pending.setReviewedByUserId(actorUserId);
        pending.setReviewedAt(LocalDateTime.now());
        pending.setReviewNote(reviewNote);
        pendingSkillRepository.save(pending);

        SkillCatalogAudit.Action action = status == PendingSkill.Status.AUTO_PROMOTED
            ? SkillCatalogAudit.Action.AUTO_PROMOTED
            : SkillCatalogAudit.Action.APPROVED;
        audit(action, pending.getId(), skill.getId(), actorUserId, reviewNote);
        skillEmbeddingSyncService.refreshSkillEmbeddingAsync(skill.getId());

        return skill;
    }

    private void recordSuggestionIfNeeded(String pendingSkillId, String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        if (pendingSkillSuggestionRepository.existsByPendingSkillIdAndUserId(pendingSkillId, userId)) {
            return;
        }
        pendingSkillSuggestionRepository.save(PendingSkillSuggestion.builder()
            .pendingSkillId(pendingSkillId)
            .userId(userId)
            .build());
    }

    private void audit(SkillCatalogAudit.Action action,
                       String pendingId,
                       String skillId,
                       String actorUserId,
                       String details) {
        SkillCatalogAudit audit = SkillCatalogAudit.builder()
            .action(action)
            .pendingSkillId(pendingId)
            .skillId(skillId)
            .actorUserId(actorUserId)
            .details(details)
            .build();
        skillCatalogAuditRepository.save(audit);
    }

    private String sanitizeDisplayName(String rawName) {
        if (rawName == null) {
            throw new IllegalArgumentException("skillName is required for unknown skill submission.");
        }
        String normalized = rawName.replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("skillName is required for unknown skill submission.");
        }
        return normalized;
    }

    private String normalizeName(String displayName) {
        return displayName.toLowerCase(Locale.ROOT)
            .replaceAll("[^\\p{L}\\p{Nd}\\s]", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
