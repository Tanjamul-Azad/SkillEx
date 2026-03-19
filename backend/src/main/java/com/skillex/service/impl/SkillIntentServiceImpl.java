package com.skillex.service.impl;

import com.skillex.dto.skill.SkillIntentInterpretRequest;
import com.skillex.dto.skill.SkillIntentInterpretResponse;
import com.skillex.dto.skill.SkillIntentInterpretResultDto;
import com.skillex.dto.skill.SkillIntentSuggestionDto;
import com.skillex.model.Skill;
import com.skillex.repository.SkillRepository;
import com.skillex.service.SkillIntentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Smart offline skill intent interpreter.
 *
 * <p>Uses three scoring layers — all computed dynamically against live catalog
 * data, with no hardcoded synonyms. As new skills and descriptions are added,
 * matching quality improves automatically.
 *
 * <h3>Scoring Layers</h3>
 * <ol>
 *   <li><b>Token Matching (0–1.0)</b>: Jaro-Winkler similarity between each
 *       user keyword and each token in the skill name. JW ≥ 0.85 = near-exact
 *       match (handles typos, plurals, normalisation differences).
 *       Exact hit → 1.0. Substring containment → 0.88.</li>
 *   <li><b>Character Bigram Similarity (0–1.0)</b>: Sørensen–Dice coefficient
 *       over character bigrams. Detects morphologically related words even when
 *       JW fails: "cinematography" ↔ "photography" (share -ography), "filming"
 *       ↔ "film" production, etc. Threshold: bigram ≥ 0.40.</li>
 *   <li><b>Description Keyword Match (0–0.55)</b>: Each user keyword is looked
 *       up in the full skill description text. Exact token match in description
 *       = 0.55 bonus. Supports cases like "filming" matching "Video Editing"
 *       whose description says "produce professional videos".</li>
 * </ol>
 *
 * <h3>Final Score</h3>
 * {@code score = max(layerNameScore, layerBigramScore) + descriptionBonus}
 * Capped at 0.97 (only exact catalog‐name match returns 1.0).
 */
@Service
@RequiredArgsConstructor
public class SkillIntentServiceImpl implements SkillIntentService {

    private static final int    MAX_SUGGESTIONS  = 3;
    private static final double MIN_SCORE        = 0.25; // suppress noise
    private static final double JW_NEAR_MATCH    = 0.85; // JW threshold to accept fuzzy token match
    private static final double BIGRAM_THRESHOLD = 0.40; // bigram threshold to count as morphological match

    private final SkillRepository skillRepository;

    // ── Stop words (noise words stripped from user intent) ────────────────────
    private static final Set<String> STOP_WORDS = Set.of(
        // articles / pronouns / prepositions
        "i","me","my","we","our","you","your","he","she","they","it",
        "a","an","the","and","or","but","so","for","to","of","in","on",
        "at","by","as","is","be","are","was","were","am","been","have",
        "has","had","do","does","did","will","would","could","should",
        "may","might","can","with","from","into","about","this","that",
        "these","those","what","which","who","how","when","where","why",
        "not","no","also","just","very","really","bit","lot","some",
        // intent-specific noise
        "teach","learn","learning","teaching","want","like","love","enjoy",
        "need","help","improve","practice","study","studying","understand",
        "start","begin","get","know","become","make","use","try","take",
        "interested","interest","passionate","passion","course","skill",
        "skills","topic","thing","things","way","well","good","great",
        "best","new","more","much","many","other","same","such"
    );

    // ── Public API ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public SkillIntentInterpretResponse interpret(SkillIntentInterpretRequest request) {
        List<Skill> catalog = skillRepository.findAll();
        SkillIntentInterpretResultDto teach = interpretOne(
            request == null ? null : request.teachText(), catalog);
        SkillIntentInterpretResultDto learn = interpretOne(
            request == null ? null : request.learnText(), catalog);
        return new SkillIntentInterpretResponse(teach, learn);
    }

    // ── Core matching ──────────────────────────────────────────────────────────

    private SkillIntentInterpretResultDto interpretOne(String rawText, List<Skill> catalog) {
        String normalized = normalize(rawText);
        if (normalized.isBlank() || catalog.isEmpty()) {
            return new SkillIntentInterpretResultDto(rawText, inferLevel(rawText), null, List.of());
        }

        List<String> keywords = extractKeywords(normalized);
        if (keywords.isEmpty()) {
            return new SkillIntentInterpretResultDto(rawText, inferLevel(rawText), null, List.of());
        }

        List<SkillIntentSuggestionDto> ranked = catalog.stream()
            .map(skill -> score(skill, keywords))
            .filter(s -> s.confidence() >= (int)(MIN_SCORE * 100))
            .sorted(Comparator.comparingInt(SkillIntentSuggestionDto::confidence).reversed())
            .limit(MAX_SUGGESTIONS)
            .collect(Collectors.toList());

        // If nothing passed the threshold, surface the single best anyway so UI isn't empty
        if (ranked.isEmpty()) {
            catalog.stream()
                .map(skill -> score(skill, keywords))
                .max(Comparator.comparingInt(SkillIntentSuggestionDto::confidence))
                .ifPresent(ranked::add);
        }

        SkillIntentSuggestionDto primary = ranked.isEmpty() ? null : ranked.get(0);
        return new SkillIntentInterpretResultDto(rawText, inferLevel(rawText), primary, ranked);
    }

    // ── Skill Scoring ──────────────────────────────────────────────────────────

    private SkillIntentSuggestionDto score(Skill skill, List<String> keywords) {
        String skillNameLc  = normalize(skill.getName());
        String categoryLc   = normalize(skill.getCategory());
        String descLc       = normalize(skill.getDescription());
        List<String> nameTok = tokenize(skillNameLc);
        List<String> descTok = tokenize(descLc);
        Set<String> descSet  = new HashSet<>(descTok);

        double bestNameScore   = 0.0;
        double bestBigramScore = 0.0;
        double bestDescBonus   = 0.0;
        double bestCatScore    = 0.0;

        for (String kw : keywords) {
            // ── Layer 1: Token matching against skill name ─────────────────
            double kwNameScore = 0.0;

            // 1a. Does full normalized skill name contain keyword? (phrase match)
            if (skillNameLc.equals(kw)) {
                kwNameScore = 1.0;
            } else if (skillNameLc.contains(kw) && kw.length() >= 4) {
                kwNameScore = Math.max(kwNameScore, 0.92);
            } else if (kw.contains(skillNameLc) && skillNameLc.length() >= 4) {
                kwNameScore = Math.max(kwNameScore, 0.85);
            }

            // 1b. Per-token Jaro-Winkler matching against each name token
            for (String nt : nameTok) {
                if (kw.equals(nt)) {
                    kwNameScore = 1.0;
                    break;
                }
                if (kw.length() >= 4 && nt.contains(kw)) {
                    kwNameScore = Math.max(kwNameScore, 0.88);
                }
                if (nt.length() >= 4 && kw.contains(nt)) {
                    kwNameScore = Math.max(kwNameScore, 0.83);
                }
                double jw = jaroWinkler(kw, nt);
                if (jw >= JW_NEAR_MATCH) {
                    kwNameScore = Math.max(kwNameScore, jw);
                }
            }
            bestNameScore = Math.max(bestNameScore, kwNameScore);

            // ── Layer 2: Character bigram similarity (morphological) ───────
            // Compare keyword bigrams against each name token bigrams
            for (String nt : nameTok) {
                double bg = bigramSimilarity(kw, nt);
                if (bg >= BIGRAM_THRESHOLD) {
                    bestBigramScore = Math.max(bestBigramScore, bg * 0.80); // scaled weight
                }
            }
            // Also compare against full skill name bigrams
            double bgFull = bigramSimilarity(kw, skillNameLc);
            if (bgFull >= BIGRAM_THRESHOLD) {
                bestBigramScore = Math.max(bestBigramScore, bgFull * 0.85);
            }

            // ── Category boost (moderate) ──────────────────────────────────
            for (String ct : tokenize(categoryLc)) {
                if (kw.equals(ct)) {
                    bestCatScore = Math.max(bestCatScore, 0.35);
                } else if (jaroWinkler(kw, ct) >= JW_NEAR_MATCH) {
                    bestCatScore = Math.max(bestCatScore, 0.25);
                }
            }

            // ── Layer 3: Description keyword matching ──────────────────────
            // Exact keyword token in description (min 4 chars to avoid noise)
            if (kw.length() >= 4 && descSet.contains(kw)) {
                bestDescBonus = Math.max(bestDescBonus, 0.65);
            }
            // Substring of description contains keyword
            else if (kw.length() >= 5 && descLc.contains(kw)) {
                bestDescBonus = Math.max(bestDescBonus, 0.55);
            }
            // Near-JW match with any description token (handles minor typos)
            else {
                for (String dt : descTok) {
                    if (dt.length() < 4) continue;
                    double jw = jaroWinkler(kw, dt);
                    if (jw >= JW_NEAR_MATCH) {
                        bestDescBonus = Math.max(bestDescBonus, 0.40);
                        break;
                    }
                }
            }
        }

        // ── Combine layers ─────────────────────────────────────────────────
        // Name match and bigram match compete; description is additive bonus.
        // Description alone can drive a result (e.g., 'javascript' found in
        // 'Web Development' description) — weighted at 0.70 so it scores ~0.45.
        double combined = Math.max(bestNameScore, bestBigramScore)
                        + (bestDescBonus * 0.70)  // description: high-weight additive bonus
                        + (bestCatScore  * 0.30);  // category: small additive boost

        // Suppress skills where no signal fired at all
        if (bestNameScore == 0.0 && bestBigramScore < BIGRAM_THRESHOLD
                && bestDescBonus == 0.0 && bestCatScore == 0.0) {
            combined = 0.0;
        }

        int confidence = (int) Math.round(Math.min(0.97, combined) * 100);
        if (bestNameScore == 1.0) confidence = 97; // near-perfect for exact name match
        confidence = Math.max(0, confidence);

        return new SkillIntentSuggestionDto(
            skill.getId(), skill.getName(), skill.getCategory(), confidence, false);
    }

    // ── Character Bigram Similarity (Sørensen–Dice) ────────────────────────────

    /**
     * Sørensen–Dice coefficient over character bigrams.
     *
     * <p>Examples:
     * <ul>
     *   <li>"cinematography" ↔ "photography" → ~0.72 (shares -ography)</li>
     *   <li>"javascript"     ↔ "java"        → ~0.50 (shares java- prefix)</li>
     *   <li>"javascript"     ↔ "french"      → ~0.07 (almost nothing)</li>
     * </ul>
     */
    private double bigramSimilarity(String a, String b) {
        if (a == null || b == null || a.length() < 2 || b.length() < 2) return 0.0;
        Set<String> biA = bigrams(a);
        Set<String> biB = bigrams(b);
        if (biA.isEmpty() || biB.isEmpty()) return 0.0;
        long common = biA.stream().filter(biB::contains).count();
        return (2.0 * common) / (biA.size() + biB.size());
    }

    private Set<String> bigrams(String s) {
        Set<String> result = new LinkedHashSet<>();
        for (int i = 0; i < s.length() - 1; i++) {
            result.add(s.substring(i, i + 2));
        }
        return result;
    }

    // ── Jaro-Winkler ──────────────────────────────────────────────────────────

    /**
     * Jaro-Winkler similarity in [0, 1].
     * Best for short token comparison with possible typos.
     * Only apply Winkler prefix boost when Jaro ≥ 0.7.
     */
    private double jaroWinkler(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        if (s1.equals(s2)) return 1.0;
        if (s1.isEmpty() || s2.isEmpty()) return 0.0;
        double j = jaro(s1, s2);
        if (j < 0.7) return j;
        int prefix = 0;
        int cap = Math.min(4, Math.min(s1.length(), s2.length()));
        while (prefix < cap && s1.charAt(prefix) == s2.charAt(prefix)) prefix++;
        return j + prefix * 0.1 * (1.0 - j);
    }

    private double jaro(String s1, String s2) {
        int l1 = s1.length(), l2 = s2.length();
        int window = Math.max(0, Math.max(l1, l2) / 2 - 1);
        boolean[] m1 = new boolean[l1], m2 = new boolean[l2];
        int matches = 0;
        for (int i = 0; i < l1; i++) {
            int lo = Math.max(0, i - window), hi = Math.min(i + window + 1, l2);
            for (int j = lo; j < hi; j++) {
                if (!m2[j] && s1.charAt(i) == s2.charAt(j)) {
                    m1[i] = m2[j] = true; matches++; break;
                }
            }
        }
        if (matches == 0) return 0.0;
        int t = 0, k = 0;
        for (int i = 0; i < l1; i++) {
            if (!m1[i]) continue;
            while (!m2[k]) k++;
            if (s1.charAt(i) != s2.charAt(k)) t++;
            k++;
        }
        return (matches / (double) l1 + matches / (double) l2
                + (matches - t / 2.0) / matches) / 3.0;
    }

    // ── Text utilities ─────────────────────────────────────────────────────────

    private List<String> extractKeywords(String normalized) {
        return Arrays.stream(normalized.split("\\s+"))
            .filter(t -> !t.isBlank() && t.length() >= 2 && !STOP_WORDS.contains(t))
            .distinct()
            .collect(Collectors.toList());
    }

    private List<String> tokenize(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.split("\\s+"))
            .filter(t -> !t.isBlank())
            .collect(Collectors.toList());
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9\\s]", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private String inferLevel(String rawText) {
        if (rawText == null) return null;
        Set<String> tokens = new HashSet<>(tokenize(normalize(rawText)));
        if (containsAny(tokens, "beginner","new","basic","basics","novice","zero","starter")) return "Beginner";
        if (containsAny(tokens, "advanced","expert","professional","senior","deep","master","pro")) return "Expert";
        return "Moderate";
    }

    private boolean containsAny(Set<String> tokens, String... terms) {
        for (String t : terms) if (tokens.contains(t)) return true;
        return false;
    }
}
