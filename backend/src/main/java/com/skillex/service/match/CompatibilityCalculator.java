package com.skillex.service.match;

import com.skillex.model.Skill;
import com.skillex.model.User;
import com.skillex.config.IntentMatchingProperties;
import com.skillex.repository.ExchangeRepository;
import com.skillex.service.SkillSimilarityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Computes a 0–100 compatibility score between two users.
 *
 * <h3>Formula</h3>
 * <pre>
 *   score = (SkillSimilarity × 40)
 *         + (IntentSimilarity × 20)
 *         + (Rating          × 20)
 *         + (SessionsScore   × 10)
 *         + (ActivityScore   × 10)
 *         + (ExchangeBalance × 10)
 * </pre>
 *
 * Each sub-score is first normalised to [0.0, 1.0] then multiplied by its
 * weight. The final result is clamped to [0, 100].
 *
 * <h3>Sub-score definitions</h3>
 * <dl>
 *   <dt>SkillSimilarity (weight 40)</dt>
 *   <dt>IntentSimilarity (weight 20)</dt>
 *   <dd>Main-point similarity between free-text learner/teacher intents in both
 *       directions. Uses a hybrid of lexical tag overlap and text embeddings so
 *       niche phrases can still discover semantically relevant peers.</dd>
 *
 *   <dd>Average best-match semantic similarity across both teaching directions:
 *       for each skill the viewer wants, the closest skill the candidate offers;
 *       for each skill the candidate wants, the closest skill the viewer offers.
 *       Uses {@link SkillSimilarityService} — exact matches score 1.0, related
 *       skills score by their graph edge weight, unknown pairs score 0.0.</dd>
 *
 *   <dt>Rating (weight 20)</dt>
 *   <dd>Candidate's average rating divided by the max (5.0) → normalised quality
 *       signal. Rewards experienced, well-reviewed teachers.</dd>
 *
 *   <dt>SessionsScore (weight 10)</dt>
 *   <dd>Sessions completed divided by {@value #MAX_SESSIONS} (capped at 1.0).
 *       Rewards proven experience on the platform.</dd>
 *
 *   <dt>ActivityScore (weight 10)</dt>
 *   <dd>Composite of three engagement signals (each weighted):
 *       <ul>
 *         <li>Online now (+0.30): live presence, most immediate signal</li>
 *         <li>SkillEX score (+0.40 max): accumulated platform engagement</li>
 *         <li>Account recency (+0.30 max): last update within 7 days → 0.30,
 *             within 30 days → 0.15, older → 0.0</li>
 *       </ul></dd>
 *
 *   <dt>ExchangeBalance (weight 20)</dt>
 *   <dd>Fairness signal: {@code min(initiated, received) / max(initiated, received)}.
 *       Rewards users who both request and accept exchanges — they're reliable
 *       skill-swap partners. New users (0 exchanges) receive a neutral 0.5.</dd>
 * </dl>
 *
 * <h3>OOP notes</h3>
 * <ul>
 *   <li>Single Responsibility: only scoring logic — candidate discovery lives in
 *       {@link SmartMatchStrategy}</li>
 *   <li>Open/Closed: add or re-weight a sub-score by editing only this class</li>
 *   <li>Dependency Inversion: depends on repository/service interfaces, not impls</li>
 * </ul>
 *
 * @see SmartMatchStrategy
 * @see SkillSimilarityService
 */
@Component
@RequiredArgsConstructor
public class CompatibilityCalculator {

    /** Explainable compatibility breakdown returned to the match strategy / API layer. */
    public record CompatibilityBreakdown(
        double semanticSimilarity,
        double intentSimilarity,
        double ratingScore,
        double sessionsScore,
        double activityScore,
        double exchangeBalance,
        int newUserBoost,
        int finalScore
    ) {}

    // ── Normalisation constants ───────────────────────────────────────────────

    /** Sessions needed to reach maximum sessions score. */
    private static final double MAX_SESSIONS = 20.0;

    /** Users below this threshold receive a fairness boost. */
    private static final int NEW_USER_SESSION_THRESHOLD = 3;

    /** Flat bonus added to new users' raw score so they stay visible in results. */
    private static final int NEW_USER_BOOST = 10;

    /** SkillEX score needed to reach the maximum activity contribution. */
    private static final double MAX_SKILLEX_FOR_ACTIVITY = 500.0;

    // ── Dependencies ─────────────────────────────────────────────────────────

    private final SkillSimilarityService skillSimilarityService;
    private final ExchangeRepository     exchangeRepository;
    private final IntentMatchingProperties intentMatchingProperties;
    private final IntentEmbeddingCache intentEmbeddingCache;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Compute a 0–100 compatibility score between {@code viewer} and {@code candidate}.
     *
     * @param viewer    the authenticated user requesting matches
     * @param candidate the user being evaluated
     * @return integer score in [0, 100]
     */
    public int calculate(User viewer, User candidate) {
        return analyze(viewer, candidate).finalScore();
    }

    /**
     * Compute and expose the internal sub-scores for explainability in the match API.
     */
    public CompatibilityBreakdown analyze(User viewer, User candidate) {
        double skillSim = skillSimilarity(viewer, candidate);
        double intent   = intentSimilarity(viewer, candidate);
        double rating   = ratingScore(candidate);
        double sessions = sessionsScore(candidate);
        double activity = activityScore(candidate);
        double balance  = exchangeBalance(candidate);

        double raw = (skillSim * 30)
               + (intent   * 20)
                   + (rating   * 20)
                   + (sessions * 10)
                   + (activity * 10)
               + (balance  * 10);

        int boost = newUserBoost(candidate);
        int finalScore = (int) Math.min(100, Math.round(raw) + boost);

        return new CompatibilityBreakdown(
            skillSim,
            intent,
            rating,
            sessions,
            activity,
            balance,
            boost,
            finalScore
        );
    }

    // ── Sub-scores (each returns 0.0–1.0) ─────────────────────────────────────

    /**
     * Average best-match semantic similarity across both teaching directions.
     *
     * <p>For each skill in {@code viewer.wantedSkills}, finds the highest
     * similarity among {@code candidate.offeredSkills}. Does the same in reverse.
     * The final score is the mean of all best-match scores.
     *
     * <p>Example: viewer wants Python, candidate offers Data Science (sim=0.90)
     * → contributes 0.90 to the numerator.
     */
    private double skillSimilarity(User viewer, User candidate) {
        List<Skill> myWanted      = viewer.getSkillsWanted();
        List<Skill> myOffered     = viewer.getSkillsOffered();
        List<Skill> theirOffered  = candidate.getSkillsOffered();
        List<Skill> theirWanted   = candidate.getSkillsWanted();

        double teachSum = bestMatchSum(myWanted,   theirOffered);  // how well they can teach me
        double learnSum = bestMatchSum(theirWanted, myOffered);    // how well I can teach them

        int total = myWanted.size() + theirWanted.size();
        if (total == 0) return 0.0;

        return Math.min(1.0, (teachSum + learnSum) / total);
    }

    private double intentSimilarity(User viewer, User candidate) {
        String viewerLearn = intentDocument(viewer.getLearnIntentText(), viewer.getSkillsWanted());
        String viewerTeach = intentDocument(viewer.getTeachIntentText(), viewer.getSkillsOffered());
        String candidateLearn = intentDocument(candidate.getLearnIntentText(), candidate.getSkillsWanted());
        String candidateTeach = intentDocument(candidate.getTeachIntentText(), candidate.getSkillsOffered());

        double teachMeScore = directionalIntentScore(viewerLearn, candidateTeach);
        double teachThemScore = directionalIntentScore(candidateLearn, viewerTeach);

        return Math.max(0.0, Math.min(1.0, (teachMeScore + teachThemScore) / 2.0));
    }

    private double directionalIntentScore(String learnerDoc, String teacherDoc) {
        if (learnerDoc.isBlank() || teacherDoc.isBlank()) {
            return 0.0;
        }

        double lexical = lexicalOverlap(learnerDoc, teacherDoc);
        double embedding = embeddingSimilarity(learnerDoc, teacherDoc);
        return (lexical * intentMatchingProperties.getLexicalWeight())
            + (embedding * intentMatchingProperties.getEmbeddingWeight());
    }

    private String intentDocument(String rawIntent, List<Skill> skills) {
        String skillText = skills == null ? "" : skills.stream()
            .map(Skill::getName)
            .collect(Collectors.joining(" "));

        String merged = ((rawIntent == null ? "" : rawIntent) + " " + skillText).trim();
        if (merged.isBlank()) {
            return "";
        }

        return tokenize(merged).stream().collect(Collectors.joining(" "));
    }

    private double lexicalOverlap(String left, String right) {
        Set<String> leftTokens = tokenize(left);
        Set<String> rightTokens = tokenize(right);
        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return 0.0;
        }

        long intersection = leftTokens.stream().filter(rightTokens::contains).count();
        long union = leftTokens.size() + rightTokens.size() - intersection;
        if (union <= 0) {
            return 0.0;
        }
        return (double) intersection / union;
    }

    private Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }

        return Arrays.stream(text.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{Nd}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim()
                .split("\\s+"))
            .map(this::normalizeToken)
            .filter(token -> token.length() >= 2)
                .filter(token -> !intentMatchingProperties.getStopWords().contains(token))
            .collect(Collectors.toSet());
    }

    private String normalizeToken(String token) {
            String base = intentMatchingProperties.getSynonyms().getOrDefault(token, token);
        if (base.endsWith("s") && base.length() > 4) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    private double embeddingSimilarity(String leftDoc, String rightDoc) {
            double[] left = intentEmbeddingCache.embed(leftDoc);
            double[] right = intentEmbeddingCache.embed(rightDoc);
        if (left == null || right == null || left.length == 0 || left.length != right.length) {
            return 0.0;
        }

        double dot = 0.0;
        double leftNorm = 0.0;
        double rightNorm = 0.0;

        for (int i = 0; i < left.length; i++) {
            dot += left[i] * right[i];
            leftNorm += left[i] * left[i];
            rightNorm += right[i] * right[i];
        }

        if (leftNorm == 0.0 || rightNorm == 0.0) {
            return 0.0;
        }

        double cosine = dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
        return Math.max(0.0, Math.min(1.0, cosine));
    }

    /**
     * For each skill in {@code seekerSkills}, compute the best similarity match
     * against any skill in {@code providerSkills}, then return the sum.
     */
    private double bestMatchSum(List<Skill> seekerSkills, List<Skill> providerSkills) {
        if (seekerSkills.isEmpty() || providerSkills.isEmpty()) return 0.0;

        double sum = 0.0;
        for (Skill seeker : seekerSkills) {
            double best = 0.0;
            for (Skill provider : providerSkills) {
                double sim = skillSimilarityService.computeSimilarity(
                    seeker.getId(), provider.getId());
                if (sim > best) best = sim;
            }
            sum += best;
        }
        return sum;
    }

    /**
     * Rating normalised to [0, 1]: {@code rating / 5.0}.
     * A 5-star teacher → 1.0; unrated → 0.0.
     */
    private double ratingScore(User candidate) {
        if (candidate.getRating() == null) return 0.0;
        return Math.min(1.0, candidate.getRating().doubleValue() / 5.0);
    }

    /**
     * Sessions experience normalised to [0, 1].
     * {@value #MAX_SESSIONS} or more completed sessions → 1.0.
     */
    private double sessionsScore(User candidate) {
        if (candidate.getSessionsCompleted() == null) return 0.0;
        return Math.min(1.0, candidate.getSessionsCompleted() / MAX_SESSIONS);
    }

    /**
     * Composite activity score from three engagement signals (sum capped at 1.0):
     * <ul>
     *   <li>Online presence: 0.30 if currently online</li>
     *   <li>SkillEX score:   up to 0.40 (score / {@value #MAX_SKILLEX_FOR_ACTIVITY})</li>
     *   <li>Recency:         0.30 if updated ≤ 7 days ago, 0.15 if ≤ 30 days</li>
     * </ul>
     */
    private double activityScore(User candidate) {
        double online  = Boolean.TRUE.equals(candidate.getIsOnline()) ? 0.30 : 0.0;

        double skillex = 0.0;
        if (candidate.getSkillexScore() != null) {
            skillex = Math.min(0.40, (candidate.getSkillexScore() / MAX_SKILLEX_FOR_ACTIVITY) * 0.40);
        }

        double recency = recencyScore(candidate.getUpdatedAt());

        return Math.min(1.0, online + skillex + recency);
    }

    /**
     * Recency contribution based on how recently the candidate's profile was updated.
     *
     * @return 0.30 if updated within 7 days, 0.15 if within 30 days, 0.0 otherwise
     */
    private double recencyScore(LocalDateTime updatedAt) {
        if (updatedAt == null) return 0.0;
        long days = ChronoUnit.DAYS.between(updatedAt, LocalDateTime.now());
        if (days <= 7)  return 0.30;
        if (days <= 30) return 0.15;
        return 0.0;
    }

    /**
     * Exchange balance — fairness of participation across both sides of exchanges.
     *
     * <pre>
     *   balance = min(initiated, received) / max(initiated, received)
     * </pre>
     *
     * A user who has both initiated and received roughly equal exchanges → 1.0.
     * A user who only ever receives (passive) or only initiates → scores lower.
     * A new user with no exchanges → neutral 0.50.
     */
    private double exchangeBalance(User candidate) {
        long initiated = exchangeRepository.countByRequesterId(candidate.getId());
        long received  = exchangeRepository.countByReceiverId(candidate.getId());

        long total = initiated + received;
        if (total == 0) return 0.50;    // no history yet — neutral

        long smaller = Math.min(initiated, received);
        long larger  = Math.max(initiated, received);
        return larger > 0 ? (double) smaller / larger : 1.0;
    }

    /**
     * New-user fairness boost.
     *
     * <p>New users are disadvantaged in every sub-score (no ratings, no sessions,
     * no exchange history). A flat +{@value #NEW_USER_BOOST} point bonus keeps
     * them visible in match results until they have completed at least
     * {@value #NEW_USER_SESSION_THRESHOLD} sessions.
     *
     * @param candidate the user being evaluated
     * @return {@value #NEW_USER_BOOST} if the candidate qualifies, 0 otherwise
     */
    private int newUserBoost(User candidate) {
        Integer sessions = candidate.getSessionsCompleted();
        if (sessions == null || sessions < NEW_USER_SESSION_THRESHOLD) {
            return NEW_USER_BOOST;
        }
        return 0;
    }
}
