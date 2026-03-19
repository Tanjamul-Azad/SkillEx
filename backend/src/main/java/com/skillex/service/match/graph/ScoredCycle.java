package com.skillex.service.match.graph;

/**
 * An {@link ExchangeCycle} together with its Step 8 quality score and the
 * three normalised sub-scores that make up that total.
 *
 * <h3>Formula (max 100)</h3>
 * <pre>
 *   score = (averageRating       × 40)
 *         + (skillMatchQuality   × 35)
 *         + (sessionAvailability × 25)
 * </pre>
 *
 * <h3>Sub-score definitions</h3>
 * <dl>
 *   <dt>averageRating (weight 40)</dt>
 *   <dd>Mean of all participants' star ratings normalised to [0, 1]:
 *       {@code mean(participant.rating) / 5.0}.
 *       Rewards cycles where every member is a well-reviewed teacher.</dd>
 *
 *   <dt>skillMatchQuality (weight 35)</dt>
 *   <dd>Average per-hop skill overlap quality, normalised to [0, 1].
 *       For each hop in the cycle, the quality is
 *       {@code min(1.0, matchingSkills / TARGET_SKILLS_PER_HOP)}.
 *       A hop with ≥ 3 matching skills scores 1.0; a single matching skill
 *       scores 0.33.  The average across all hops is then taken.
 *       Rewards cycles with rich, multi-skill matches — they are more
 *       flexible and likely to survive schedule conflicts.</dd>
 *
 *   <dt>sessionAvailability (weight 25)</dt>
 *   <dd>Weakest-link availability across all participants:
 *       {@code min over participants of: availability(p) = onlineFactor + experienceFactor}.
 *       Using the minimum rather than the mean ensures one unavailable
 *       participant correctly downgrades the whole cycle — a chain is only
 *       as strong as its weakest link.
 *       <ul>
 *         <li>onlineFactor:     0.50 if currently online, else 0.20</li>
 *         <li>experienceFactor: {@code min(0.50, sessionsCompleted / 20.0)}</li>
 *       </ul>
 *   </dd>
 * </dl>
 *
 * <p>All sub-scores are in [0.0, 1.0]; the final {@code score} is in [0, 100].
 *
 * <h3>OOP notes</h3>
 * Immutable record — all fields set at construction by {@link CycleScorer};
 * no setters, safe to cache and serialise.
 *
 * @see ExchangeCycle
 * @see CycleScorer
 */
public record ScoredCycle(
    ExchangeCycle cycle,
    double        averageRating,
    double        skillMatchQuality,
    double        sessionAvailability,
    int           score
) {

    /**
     * Convenience label for the UI:
     * {@code "Score 87 — Alice → Bob → Carol → Alice"}.
     */
    public String label() {
        return "Score " + score + " — " + cycle;
    }

    /**
     * Number of participants in the underlying cycle.
     * Delegates to {@link ExchangeCycle#length()}.
     */
    public int length() {
        return cycle.length();
    }
}
