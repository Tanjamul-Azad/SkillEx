package com.skillex.service.match;

import com.skillex.config.IntentMatchingProperties;
import com.skillex.dto.user.MatchUserDto;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.UserRepository;
import com.skillex.service.SkillSimilarityService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmartMatchStrategyTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SkillSimilarityService skillSimilarityService;

    @Mock
    private CompatibilityCalculator compatibilityCalculator;

    @Mock
    private IntentMatchingProperties properties;

    @InjectMocks
    private SmartMatchStrategy strategy;

    @Test
    void findMatches_shouldUseCompatibilityBreakdownRanking() {
        when(properties.getCandidatePoolFactor()).thenReturn(2);
        when(properties.getReasonThreshold()).thenReturn(0.25);

        String viewerId = UUID.randomUUID().toString();
        Skill python = skill("s1", "Python");
        Skill design = skill("s2", "Design");

        User viewer = user(viewerId, List.of(python), List.of(design));
        User candidateA = user("u-a", List.of(design), List.of(python));
        User candidateB = user("u-b", List.of(design), List.of(python));

        when(userRepository.findById(viewerId)).thenReturn(Optional.of(viewer));
        when(userRepository.findMatchCandidates(eq(viewerId), anySet(), any(Pageable.class)))
            .thenReturn(List.of("u-a", "u-b"));
        when(userRepository.findCandidatesByWantedSkills(eq(viewerId), anySet(), any(Pageable.class)))
            .thenReturn(List.of());
        when(userRepository.findIntentCandidates(eq(viewerId), any(Pageable.class)))
            .thenReturn(List.of());
        when(userRepository.findById("u-a")).thenReturn(Optional.of(candidateA));
        when(userRepository.findById("u-b")).thenReturn(Optional.of(candidateB));

        when(skillSimilarityService.expandWithSimilar(anySet(), any(Double.class))).thenAnswer(inv -> inv.getArgument(0));

        when(compatibilityCalculator.analyze(viewer, candidateA))
            .thenReturn(new CompatibilityCalculator.CompatibilityBreakdown(0.8, 0.7, 0.8, 0.5, 0.5, 0.5, 0, 84));
        when(compatibilityCalculator.analyze(viewer, candidateB))
            .thenReturn(new CompatibilityCalculator.CompatibilityBreakdown(0.5, 0.4, 0.5, 0.4, 0.3, 0.3, 0, 59));

        List<MatchUserDto> result = strategy.findMatches(UUID.fromString(viewerId), 10);

        assertEquals(2, result.size());
        assertEquals("u-a", result.get(0).id());
        assertEquals("u-b", result.get(1).id());
        assertEquals(84, result.get(0).compatibilityScore());
    }

    private static Skill skill(String id, String name) {
        Skill s = new Skill();
        s.setId(id);
        s.setName(name);
        s.setCategory("Tech");
        s.setIcon("Code");
        s.setDescription(name);
        return s;
    }

    private static User user(String id, List<Skill> offered, List<Skill> wanted) {
        User user = new User();
        user.setId(id);
        user.setName(id);
        user.setEmail(id + "@example.com");
        user.setPasswordHash("hash");
        user.setLevel(User.UserLevel.LEARNER);
        user.setRole(User.UserRole.STUDENT);
        user.setSkillexScore(0);
        user.setSessionsCompleted(0);
        user.setRating(BigDecimal.ZERO);
        user.setIsOnline(false);
        user.setJoinedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user.setSkillsOffered(offered);
        user.setSkillsWanted(wanted);
        return user;
    }
}
