# SkillEX — Feature & AI/ML Roadmap

> What's worth building next, ranked by **impact × feasibility**, grounded in the infrastructure that already exists.
> Key constraint respected throughout: **every AI feature can run free & locally** (browser Web Speech + Ollama `gemma2:2b` + the existing embedding layer) — **no paid API required.**

Legend — Effort: 🟢 small (≤1 day) · 🟡 medium (2–4 days) · 🔴 large (1–2 weeks).
Builds-on = existing service/infra it extends (so it's not greenfield).

---

## Part 1 — Flagship features (biggest "wow" + impact, not yet built)

### 1.1 🟡 Skill Chain auto-orchestration & chain rooms
**Now:** the engine *finds* cycles; a user manually sends one normal exchange request.
**Next:** when a chain is accepted, auto-notify **all** participants, coordinate multi-party acceptance, and spin up a shared **"chain room"** where the whole loop tracks progress (A→B→C→A) together. Add a `CHAIN_SWAP` exchange mode end-to-end (the enum already exists).
**Why:** turns your most novel idea from a visual into a *working multi-party transaction* — a genuine first. *Builds-on:* `ExchangeCycleFinder`, `Exchange.ExchangeMode.CHAIN_SWAP`, `NotificationPublisher`.

### 1.2 🟡 AI Learning Paths (personalized curricula)
Pick a goal skill → the system generates an ordered, multi-step learning path and **auto-matches a mentor (or a chain) for each step**, scheduling them as a sequence.
**Why:** moves SkillEX from "one-off swaps" to "guided journeys" — the retention engine. *Builds-on:* embeddings + Ollama + the matcher. (Full AI spec in Part 2.4.)

### 1.3 🟡 Group sessions & cohorts (one-to-many teaching)
A mentor teaches **many** learners at once (workshop-style), with shared notes, attendance, and group certificates.
**Why:** 10× the impact per teaching hour, and the natural bridge between 1:1 sessions and the existing Events feature. *Builds-on:* `Session`, `Event`, Agora multi-publisher (already supports it).

### 1.4 🟡 In-session collaboration tools
Shared **whiteboard**, **live code editor** (for tech skills), and file drop inside the session room — alongside the video + AI transcription you already have.
**Why:** makes the room a real teaching space, not just a call. *Builds-on:* `SessionRoomPage`, the WebSocket channel already wired for the room.

### 1.5 🔴 Bangla (বাংলা) localization (i18n)
Full UI translation + Bangla support in AI features (transcription/notes/tutor).
**Why:** this is a **Bangladesh-born platform** — Bangla support unlocks the real domestic market and is a powerful "real-world impact / accessibility" story for judges. *Builds-on:* none yet (new i18n layer) — but the single highest *reach* multiplier.

### 1.6 🟡 Recorded session library & replays
Opt-in recording → searchable library of past sessions with their AI notes/transcripts attached.
**Why:** async learning, content moat, and SEO. *Builds-on:* `SessionTranscript`, `SessionNote`, Agora cloud recording (or local).

---

## Part 2 — AI / ML roadmap (the differentiator — all free/local-capable)

> You already have the two hardest pieces: a **semantic embedding layer** and a **local LLM**. Most of these are "wire existing infra into a new surface," not new ML research.

### 2.1 🟢 AI Skill-Gap Analyzer  ⭐ start here
**Input:** your current skills + a target ("I want to become a data analyst").
**Model:** embed target → compare to skill catalog & your profile → rank missing skills; Ollama writes a 2-line rationale per gap.
**Output:** "You're 2 skills away — learn *Pandas* and *SQL*; here are 3 mentors for each."
*Builds-on:* `SkillIntentService`, embedding cache. **Effort 🟢, impact high.**

### 2.2 🟡 AI Learning Path Generator (engine behind 1.2)
**Input:** goal skill + level.
**Model:** Ollama generates an ordered syllabus (JSON: steps, prerequisites, est. hours); each step is embedding-matched to a real mentor/chain; scheduled as a multi-session plan.
**Output:** a clickable, bookable roadmap. *Builds-on:* `NoteGenerationService` (same Ollama JSON pattern), matcher.

### 2.3 🟢 AI Tutor / Practice Bot (between sessions)
A per-skill Ollama chatbot that quizzes you, answers questions, and reinforces the last session's notes — keeps learners engaged *between* human sessions.
*Builds-on:* `ContextualHelpService` + `AiHelperConversation` (the model already exists!). **High retention, low effort.**

### 2.4 🟡 AI Skill Assessment & smart certification
Before issuing a certificate, Ollama **generates a short quiz** from the skill + transcript, grades free-text answers, and feeds the score into the trust snapshot.
**Why:** makes certificates *credible* (the #1 weakness of any peer-credential). *Builds-on:* `CertificateService`, `SkillTrustService`, `NoteGenerationProcessor`.

### 2.5 🟢 Session → flashcards, quiz & action items
Extend the existing AI notes: from each transcript also emit **spaced-repetition flashcards**, a **mini-quiz**, and **action items** with follow-up reminders.
*Builds-on:* `NoteGenerationService` (one more prompt + new fields on `SessionNote`). **Tiny effort, big perceived value.**

### 2.6 🟢 Natural-language semantic search
One search box over **mentors, skills, discussions, circles** using embeddings (you already compute them) instead of keyword matching.
*Builds-on:* `SkillEmbedding`, `SkillSimilarityService`. **Effort 🟢.**

### 2.7 🟡 Smart recommendations ("learners like you")
Collaborative-filtering + embedding hybrid: "people who learned X also learned Y," "mentors you should meet," "circles for you."
*Builds-on:* the match engine + interaction history (exchanges/sessions).

### 2.8 🟡 AI Match explanations v2 (natural language)
You have `MatchExplanationService` (structured reasons). Upgrade to **Ollama-written** one-paragraph "why you two are a great match" + an icebreaker message draft.
*Builds-on:* `MatchExplanationService`.

### 2.9 🟡 Real-time chat & transcript moderation
Run the local model over messages/transcripts to flag toxicity/harassment in real time (not just admin-reactive).
*Builds-on:* `ModerationAiAssistService` (already AI-assisted) — make it proactive.

### 2.10 🔴 Anti-fraud / collusion detection (graph ML)
Detect credit-farming rings & fake sessions via graph features on the exchange/credit network (cycle density, reciprocity anomalies, velocity).
**Why:** protects the credit economy's integrity — essential once credits have value. *Builds-on:* the exchange graph you already build for chains.

### 2.11 🟡 Demand forecasting & skill-trend intelligence
Predict which skills are rising in demand (time-series on `user_skills_wanted` + searches) → powers the Impact dashboard and tells mentors what to teach.
*Builds-on:* `AnalyticsService` (just extended with the Impact endpoint).

### 2.12 🟡 Churn prediction & smart re-engagement
ML flags learners about to drop off (declining activity/streak) → triggers a personalized Ollama-written nudge or a suggested easy next step.
*Builds-on:* `ProgressService`, `XpEvent`, `SmartActionService`.

### 2.13 🟢 AI profile & content assistant
Generate skill descriptions, a polished bio, and circle/event blurbs from a few words.
*Builds-on:* Ollama. **Trivial effort, removes onboarding friction.**

### 2.14 🟡 Live captions & real-time translation
You already capture speech; add live captions + (the previously dead-coded) translation so a Bangla speaker and English speaker can pair.
**Why:** accessibility + ties to 1.5. *Builds-on:* `useTranscription`, the transcript pipeline.

### 2.15 🟡 Smart scheduling
Suggest the best session time from both users' activity patterns & timezones (lightweight model over login/active timestamps).
*Builds-on:* `SessionPresenceService`, session history.

---

## Part 3 — Economic / business / sustainability features (the B2B wedge)

### 3.1 🔴 University / institution portal (B2B2C) ⭐ the real revenue wedge
A licensed dashboard for a university: enrolled-student skill analytics, **skill-gap reports**, co-curricular credit tracking, white-label circles.
**Why:** campuses are a captive two-sided market — the realistic go-to-market. *Builds-on:* `AnalyticsService`, admin panel.

### 3.2 🟡 Employer / recruiter portal
Companies search **verified** skills (your certificates) → talent funnel; pay to verify credentials at scale.
*Builds-on:* certificates + public verification (already live).

### 3.3 🟡 Sponsorship & scholarship credits
Companies/NGOs **fund credit pools** for underserved learners; sponsor skill circles & challenges.
**Why:** a sustainability + social-impact story *and* a revenue line. *Builds-on:* the credit wallet/transaction system.

### 3.4 🟢 Embeddable verified badges & public profiles
Public, SEO-friendly profile + the GitHub/README badge (markdown already generated) → organic growth loop.
*Builds-on:* certificate `githubBadgeMarkdown` (already built).

### 3.5 🟡 Credit economy mechanics
Escrow credits during a booked session, optional credit **decay** to keep them circulating, staking on commitments.
**Why:** keeps the marketplace liquid and "money-like." *Builds-on:* `CreditService`.

### 3.6 🟢 Impact / SDG reporting
Extend the new Impact dashboard into a shareable "social impact report" (learners reached, tuition-equivalent value, SDG-4 education access).
*Builds-on:* the Impact endpoint you just shipped.

---

## Part 4 — Engagement, trust & quality-of-life

- 🟢 **Seasons / leagues / leaderboards** (XP already exists) — competitive retention.
- 🟢 **Quests & missions** ("teach 3 sessions this week → bonus credits").
- 🟢 **Referral program** (credits for inviting) — viral growth.
- 🟡 **.edu / student email verification** → "Verified Student" badge (trust).
- 🟡 **Structured two-sided review rubrics** (clarity, prep, helpfulness) feeding trust score.
- 🟡 **Availability calendar + timezone-aware scheduling**.
- 🟡 **PWA / installable mobile + offline mode** (reach).
- 🟢 **Dispute / "session didn't happen" flow** (protects credits).
- 🟢 **Notification preferences & digest emails** (re-engagement).

---

## Part 5 — Recommended sequencing (what I'd actually do)

**Tier 0 — highest impact-per-day (do first):**
1. AI Skill-Gap Analyzer (2.1) 🟢
2. Session → flashcards/quiz/action-items (2.5) 🟢
3. AI Tutor / Practice Bot (2.3) 🟢 — `AiHelperConversation` already exists
4. Semantic search (2.6) 🟢
5. AI profile assistant (2.13) 🟢

**Tier 1 — flagship differentiators:**
6. AI Learning Paths (1.2 / 2.2) 🟡
7. Skill Chain auto-orchestration (1.1) 🟡
8. AI Skill Assessment → credible certificates (2.4) 🟡
9. Group sessions (1.3) 🟡

**Tier 2 — business & moat:**
10. University portal (3.1) 🔴
11. Anti-fraud graph ML (2.10) 🔴
12. Bangla localization (1.5) 🔴
13. In-session whiteboard/code (1.4) 🟡

**The single best next build:** **AI Learning Paths (2.2) + Skill-Gap Analyzer (2.1)** together — they reuse every asset you have (embeddings, Ollama, matcher, chains), need no paid API, and reframe SkillEX from "a swap marketplace" into **"an AI study advisor that happens to run on a cashless skill economy."** That's the story that wins beyond the demo.
