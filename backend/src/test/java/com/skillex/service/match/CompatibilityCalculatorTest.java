package com.skillex.service.match;

import com.skillex.config.IntentMatchingProperties;
import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.repository.ExchangeRepository;
import com.skillex.service.SkillSimilarityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

class CompatibilityCalculatorTest {

    private SkillSimilarityService similarityService;
    private ExchangeRepository exchangeRepository;
    private IntentEmbeddingCache embeddingCache;
    private IntentMatchingProperties props;
    private CompatibilityCalculator calculator;

    @BeforeEach
    void setUp() {
        similarityService = Mockito.mock(SkillSimilarityService.class);
        exchangeRepository = Mockito.mock(ExchangeRepository.class);
        embeddingCache = Mockito.mock(IntentEmbeddingCache.class);

        props = new IntentMatchingProperties();
        props.setLexicalWeight(0.4);
        props.setEmbeddingWeight(0.6);
        props.setReasonThreshold(0.25);

        calculator = new CompatibilityCalculator(similarityService, exchangeRepository, props, embeddingCache);

        when(similarityService.computeSimilarity(anyString(), anyString())).thenReturn(0.0);
        when(exchangeRepository.countByRequesterId(anyString())).thenReturn(0L);
        when(exchangeRepository.countByReceiverId(anyString())).thenReturn(0L);
        when(embeddingCache.embed(anyString())).thenReturn(new double[]{1.0, 0.0});
    }

    @Test
    void calculate_shouldGiveNewUserBoostForLowSessionCandidates() {
        User viewer = user("u-viewer", List.of(skill("s1", "Python")), List.of(skill("s2", "Design")));
        User candidate = user("u-candidate", List.of(skill("s2", "Design")), List.of(skill("s1", "Python")));
        candidate.setSessionsCompleted(0);
        candidate.setRating(BigDecimal.ZERO);
        candidate.setSkillexScore(0);
        candidate.setUpdatedAt(LocalDateTime.now().minusDays(40));

        when(similarityService.computeSimilarity("s2", "s2")).thenReturn(1.0);
        when(similarityService.computeSimilarity("s1", "s1")).thenReturn(1.0);

        CompatibilityCalculator.CompatibilityBreakdown breakdown = calculator.analyze(viewer, candidate);

        assertEquals(10, breakdown.newUserBoost());
        assertTrue(breakdown.finalScore() >= 10, "Final score should include new-user boost.");
    }

    @Test
    void calculate_shouldNotApplyNewUserBoostAfterThreshold() {
        User viewer = user("u-viewer", List.of(skill("s1", "Python")), List.of(skill("s2", "Design")));
        User candidate = user("u-candidate", List.of(skill("s2", "Design")), List.of(skill("s1", "Python")));
        candidate.setSessionsCompleted(5);
        candidate.setRating(BigDecimal.ZERO);
        candidate.setSkillexScore(0);
        candidate.setUpdatedAt(LocalDateTime.now().minusDays(40));

        when(similarityService.computeSimilarity("s2", "s2")).thenReturn(1.0);
        when(similarityService.computeSimilarity("s1", "s1")).thenReturn(1.0);

        CompatibilityCalculator.CompatibilityBreakdown breakdown = calculator.analyze(viewer, candidate);
        assertEquals(0, breakdown.newUserBoost(), "No new-user boost once sessions >= 3");
    }

    @Test
    void calculate_shouldIncreaseWithHighRatingAndActivity() {
        User viewer = user("u-viewer", List.of(skill("s1", "Python")), List.of(skill("s2", "Design")));
        User candidate = user("u-candidate", List.of(skill("s2", "Design")), List.of(skill("s1", "Python")));

        when(similarityService.computeSimilarity("s2", "s2")).thenReturn(1.0);
        when(similarityService.computeSimilarity("s1", "s1")).thenReturn(1.0);

        candidate.setSessionsCompleted(12);
        candidate.setRating(new BigDecimal("4.8"));
        candidate.setSkillexScore(300);
        candidate.setIsOnline(true);
        candidate.setUpdatedAt(LocalDateTime.now().minusDays(2));
        when(exchangeRepository.countByRequesterId("u-candidate")).thenReturn(6L);
        when(exchangeRepository.countByReceiverId("u-candidate")).thenReturn(4L);

        int score = calculator.calculate(viewer, candidate);
        assertTrue(score >= 80, "High rating/activity profile should produce a strong score.");
    }

    @Test
    void calculate_shouldUseIntentSignalWhenSkillsDoNotOverlap() {
        User viewer = user("u-viewer", List.of(skill("s10", "Cooking")), List.of(skill("s20", "Cycling")));
        User candidate = user("u-candidate", List.of(skill("s30", "Robotics")), List.of(skill("s40", "Painting")));

        viewer.setLearnIntentText("want diy upcycling craft");
        viewer.setTeachIntentText("teach backend coding");
        candidate.setTeachIntentText("teach diy upcycling craft");
        candidate.setLearnIntentText("want backend coding");

        candidate.setSessionsCompleted(1);
        candidate.setUpdatedAt(LocalDateTime.now().minusDays(45));

        // No skill graph overlap
        when(similarityService.computeSimilarity(anyString(), anyString())).thenReturn(0.0);
        // Intent embeddings identical -> cosine 1.0
        when(embeddingCache.embed(anyString())).thenReturn(new double[]{1.0, 0.0, 0.0});

        CompatibilityCalculator.CompatibilityBreakdown breakdown = calculator.analyze(viewer, candidate);
        assertEquals(0.0, breakdown.semanticSimilarity(), 0.0001);
        assertTrue(breakdown.intentSimilarity() > 0.0, "Intent similarity should contribute even without skill overlap.");
        assertEquals(10, breakdown.newUserBoost());
    }

    @Test
    void analyze_shouldReportDeterministicBreakdownValues() {
        User viewer = user("u-viewer", List.of(skill("s1", "Python")), List.of(skill("s2", "Design")));
        User candidate = user("u-candidate", List.of(skill("s2", "Design")), List.of(skill("s1", "Python")));

        viewer.setLearnIntentText("learn design systems");
        viewer.setTeachIntentText("teach python backend");
        candidate.setTeachIntentText("teach design systems");
        candidate.setLearnIntentText("learn python backend");

        when(similarityService.computeSimilarity("s2", "s2")).thenReturn(1.0);
        when(similarityService.computeSimilarity("s1", "s1")).thenReturn(1.0);
        when(embeddingCache.embed(anyString())).thenReturn(new double[]{1.0, 0.0});

        candidate.setSessionsCompleted(2);
        candidate.setRating(new BigDecimal("3.5"));
        candidate.setSkillexScore(200);
        candidate.setIsOnline(true);
        candidate.setUpdatedAt(LocalDateTime.now().minusDays(10));
        when(exchangeRepository.countByRequesterId("u-candidate")).thenReturn(3L);
        when(exchangeRepository.countByReceiverId("u-candidate")).thenReturn(1L);

        CompatibilityCalculator.CompatibilityBreakdown b = calculator.analyze(viewer, candidate);

        assertEquals(1.0, b.semanticSimilarity());
        assertEquals(1.0, b.intentSimilarity());
        assertEquals(0.7, b.ratingScore());
        assertEquals(0.1, b.sessionsScore());
        assertEquals(0.61, b.activityScore(), 0.0001);
        assertEquals(1.0 / 3.0, b.exchangeBalance(), 0.0001);
        assertEquals(10, b.newUserBoost());
        assertEquals(84, b.finalScore());
    }

    private static Skill skill(String id, String name) {
        Skill s = new Skill();
        s.setId(id);
        s.setName(name);
        s.setIcon("Code");
        s.setCategory("Tech");
        s.setDescription(name);
        return s;
    }

    private static User user(String id, List<Skill> offered, List<Skill> wanted) {
        User u = new User();
        u.setId(id);
        u.setName(id);
        u.setEmail(id + "@example.com");
        u.setPasswordHash("x");
        u.setUniversity("U");
        u.setAvatar(null);
        u.setBio("");
        u.setRole(User.UserRole.STUDENT);
        u.setLevel(User.UserLevel.NEWCOMER);
        u.setSkillexScore(0);
        u.setSessionsCompleted(0);
        u.setRating(BigDecimal.ZERO);
        u.setIsOnline(false);
        u.setJoinedAt(LocalDateTime.now());
        u.setUpdatedAt(LocalDateTime.now().minusDays(30));
        u.setSkillsOffered(offered);
        u.setSkillsWanted(wanted);
        return u;
    }
}
