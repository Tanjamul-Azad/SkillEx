package com.skillex.service.impl;

import com.skillex.dto.portfolio.CreatePortfolioProofRequest;
import com.skillex.model.PortfolioProof;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.PortfolioProofRepository;
import com.skillex.repository.SessionRepository;
import com.skillex.repository.SkillRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.AccountRestrictionService;
import com.skillex.service.ProgressService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceImplTest {

    @Mock private PortfolioProofRepository proofRepository;
    @Mock private UserRepository userRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private SessionRepository sessionRepository;
    @Mock private AccountRestrictionService restrictionService;
    @Mock private ProgressService progressService;

    private PortfolioServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PortfolioServiceImpl(
            proofRepository,
            userRepository,
            skillRepository,
            sessionRepository,
            restrictionService,
            progressService
        );
    }

    @Test
    void create_rejectsSkillNotOnUserProfile() {
        User user = user("user-1");
        Skill owned = skill("skill-owned", "Java");
        Skill unrelated = skill("skill-other", "Figma");
        user.setSkillsOffered(List.of(owned));

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(skillRepository.findById(unrelated.getId())).thenReturn(Optional.of(unrelated));

        assertThrows(AccessDeniedException.class, () -> service.create(user.getId(), request(unrelated.getId())));

        verify(proofRepository, never()).save(any(PortfolioProof.class));
        verify(progressService, never()).awardXp(any(), any(), any(), eq(20), any());
    }

    @Test
    void create_allowsProfileSkillAndAwardsXp() {
        User user = user("user-1");
        Skill owned = skill("skill-owned", "Java");
        user.setSkillsOffered(List.of(owned));

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(skillRepository.findById(owned.getId())).thenReturn(Optional.of(owned));
        when(proofRepository.save(any(PortfolioProof.class))).thenAnswer(invocation -> {
            PortfolioProof proof = invocation.getArgument(0);
            proof.setId("proof-1");
            return proof;
        });

        var dto = service.create(user.getId(), request(owned.getId()));

        assertEquals("proof-1", dto.id());
        verify(progressService).awardXp(user.getId(), "PORTFOLIO_PROOF", "proof-1", 20, "Added proof to Skill Portfolio.");
    }

    @Test
    void listForUser_hidesPrivateProofsFromPublicViewer() {
        String ownerId = "owner-1";
        when(userRepository.existsById(ownerId)).thenReturn(true);
        when(proofRepository.findByUserIdAndVisibilityOrderByFeaturedDescCreatedAtDesc(
            eq(ownerId),
            eq(PortfolioProof.Visibility.PUBLIC),
            any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        service.listForUser(null, ownerId, 0, 20);

        verify(proofRepository).findByUserIdAndVisibilityOrderByFeaturedDescCreatedAtDesc(
            eq(ownerId),
            eq(PortfolioProof.Visibility.PUBLIC),
            any(Pageable.class)
        );
        verify(proofRepository, never()).findByUserIdOrderByFeaturedDescCreatedAtDesc(any(), any());
    }

    @Test
    void delete_rejectsProofOwnedByAnotherUser() {
        User owner = user("owner-1");
        PortfolioProof proof = PortfolioProof.builder()
            .id("proof-1")
            .user(owner)
            .title("Proof")
            .proofType(PortfolioProof.ProofType.PROJECT)
            .visibility(PortfolioProof.Visibility.PUBLIC)
            .build();

        when(proofRepository.findById(proof.getId())).thenReturn(Optional.of(proof));

        assertThrows(AccessDeniedException.class, () -> service.delete("other-user", proof.getId()));

        verify(proofRepository, never()).delete(any(PortfolioProof.class));
    }

    private static CreatePortfolioProofRequest request(String skillId) {
        return new CreatePortfolioProofRequest(
            skillId,
            "Portfolio proof",
            "Proof description",
            "PROJECT",
            "https://example.com/proof",
            null,
            null,
            "PUBLIC",
            true
        );
    }

    private static User user(String id) {
        User user = new User();
        user.setId(id);
        user.setName("User");
        user.setSkillsOffered(List.of());
        user.setSkillsWanted(List.of());
        return user;
    }

    private static Skill skill(String id, String name) {
        Skill skill = new Skill();
        skill.setId(id);
        skill.setName(name);
        skill.setIcon("Code");
        skill.setCategory("Tech");
        return skill;
    }
}
