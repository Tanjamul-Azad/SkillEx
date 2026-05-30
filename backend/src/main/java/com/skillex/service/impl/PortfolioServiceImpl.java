package com.skillex.service.impl;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.portfolio.CreatePortfolioProofRequest;
import com.skillex.dto.portfolio.PortfolioProofDto;
import com.skillex.model.PortfolioProof;
import com.skillex.model.Session;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.PortfolioProofRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.PortfolioService;
import com.skillex.service.ProgressService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PortfolioServiceImpl implements PortfolioService {

    private final PortfolioProofRepository proofRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final SessionRepository sessionRepository;
    private final AccountRestrictionService restrictionService;
    private final ProgressService progressService;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<PortfolioProofDto> listForUser(String viewerUserId, String targetUserId, int page, int size) {
        if (!userRepository.existsById(targetUserId)) {
            throw new EntityNotFoundException("User not found: " + targetUserId);
        }
        var pageable = PageRequest.of(page, size);
        boolean owner = viewerUserId != null && viewerUserId.equals(targetUserId);
        var result = owner
            ? proofRepository.findByUserIdOrderByFeaturedDescCreatedAtDesc(targetUserId, pageable)
            : proofRepository.findByUserIdAndVisibilityOrderByFeaturedDescCreatedAtDesc(
                targetUserId, PortfolioProof.Visibility.PUBLIC, pageable);
        return PagedResponse.of(result.map(this::toDto));
    }

    @Override
    @Transactional
    public PortfolioProofDto create(String userId, CreatePortfolioProofRequest request) {
        restrictionService.assertCanUseAccount(userId, "PROFILE");
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        Skill skill = request.skillId() == null || request.skillId().isBlank()
            ? null
            : skillRepository.findById(request.skillId())
                .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + request.skillId()));
        Session session = request.sourceSessionId() == null || request.sourceSessionId().isBlank()
            ? null
            : sessionRepository.findById(request.sourceSessionId())
                .orElseThrow(() -> new EntityNotFoundException("Session not found: " + request.sourceSessionId()));
        if (session != null && !session.getTeacher().getId().equals(userId) && !session.getLearner().getId().equals(userId)) {
            throw new AccessDeniedException("You can only attach outcomes from your own sessions.");
        }

        PortfolioProof proof = PortfolioProof.builder()
            .user(user)
            .skill(skill)
            .title(request.title().trim())
            .description(blankToNull(request.description()))
            .proofType(PortfolioProof.ProofType.valueOf(request.proofType().toUpperCase()))
            .url(blankToNull(request.url()))
            .mediaUrl(blankToNull(request.mediaUrl()))
            .sourceSession(session)
            .visibility(request.visibility() == null || request.visibility().isBlank()
                ? PortfolioProof.Visibility.PUBLIC
                : PortfolioProof.Visibility.valueOf(request.visibility().toUpperCase()))
            .featured(Boolean.TRUE.equals(request.featured()))
            .build();
        PortfolioProof saved = proofRepository.save(proof);
        progressService.awardXp(userId, "PORTFOLIO_PROOF", saved.getId(), 20, "Added proof to Skill Portfolio.");
        return toDto(saved);
    }

    @Override
    @Transactional
    public void delete(String userId, String proofId) {
        PortfolioProof proof = proofRepository.findById(proofId)
            .orElseThrow(() -> new EntityNotFoundException("Portfolio proof not found: " + proofId));
        if (!proof.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can only delete your own portfolio proof.");
        }
        proofRepository.delete(proof);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private PortfolioProofDto toDto(PortfolioProof proof) {
        Skill skill = proof.getSkill();
        return new PortfolioProofDto(
            proof.getId(),
            proof.getUser().getId(),
            skill == null ? null : new PortfolioProofDto.SkillRef(skill.getId(), skill.getName(), skill.getIcon(), skill.getCategory()),
            proof.getTitle(),
            proof.getDescription(),
            proof.getProofType().name(),
            proof.getUrl(),
            proof.getMediaUrl(),
            proof.getSourceSession() == null ? null : proof.getSourceSession().getId(),
            proof.getVisibility().name(),
            Boolean.TRUE.equals(proof.getFeatured()),
            proof.getCreatedAt(),
            proof.getUpdatedAt()
        );
    }
}
