# SkillEX Feature Implementation Architecture
## Complete Blueprint for Tier 0 + Tier 1 Features + Infrastructure

**Document Version:** 1.0  
**Target Sprint:** 3-4 days of focused implementation  
**Estimated Scope:** 13 major features + supporting infrastructure  
**Stack:** React 19 + Vite | Spring Boot 3.4 | MySQL 8 / MariaDB 10.4 | Ollama gemma2:2b | JWT + WebSocket  

---

## Table of Contents

1. [Overview & Sequencing](#overview--sequencing)
2. [Chunked Units of Work](#chunked-units-of-work)
3. [Tier 0: Quick Wins (5 features)](#tier-0-quick-wins-5-features)
4. [Tier 1: Flagship Features (4 features)](#tier-1-flagship-features-4-features)
5. [Infrastructure & Supporting Features](#infrastructure--supporting-features)
6. [Database Migration Plan](#database-migration-plan)
7. [Type Definitions & Contracts](#type-definitions--contracts)
8. [Implementation Notes & Anti-Patterns](#implementation-notes--anti-patterns)

---

# Overview & Sequencing

## Philosophy

This architecture respects your **existing strengths**:

- **Semantic embeddings** (already computed on all skills, users, intent)
- **Local LLM** (Ollama gemma2:2b, no API keys needed)
- **Real-time WebSocket** (already wired for transcripts & notes)
- **Mature session/certificate/credit/trust** infrastructure
- **Multi-party session support** (Agora RTC already handles group)

Each feature leverages existing machinery instead of introducing new dependencies. The **implementation order** is designed to:

1. **Tier 0** (Days 1–1.5): Build confidence with quick, high-impact AI features that reuse the embedding + Ollama pipeline.
2. **Tier 1** (Days 2–2.5): Orchestrate Tier 0 infrastructure into flagship learning experiences (paths, chains, groups, assessment).
3. **Infrastructure** (Day 3): Security, monitoring, moderation, PWA, analytics that unlock go-live.

---

## Feature Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 0 (Independent, parallel implementation)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  2.1 Skill-Gap Analyzer ──┐  2.5 Session Flashcards ───┐        │
│  (embeddings + Ollama)     │   (extend NoteGeneration)  │        │
│                            │                            │        │
│  2.3 Tutor Bot ────────────┤   2.6 Semantic Search ────┤        │
│  (AiHelperConversation)    │   (embeddings + ES)       │        │
│                            │                            │        │
│  2.13 Profile Assistant ───┘                            │        │
│  (Ollama text gen)                                      │        │
│                                                         │        │
│                                                      (shared)     │
│                            ┌────────────────────────────┘        │
│                            │                                      │
│                            ▼                                      │
│                    Ollama + Embeddings API                       │
│                    (centralized prompt templates)                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ feeds data to
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1 (Depend on Tier 0 infrastructure)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1.2 Learning Paths ◄─────┐                                      │
│  (Skill-Gap + matcher)     │   1.1 Chain Orchestration           │
│                            │   (Exchange + Notifications)        │
│  1.3 Group Sessions ◄──────┼─  (builds on existing sessions)     │
│  (Session + Event base)    │                                      │
│                            │   2.4 Skill Assessment ◄────┐       │
│  2.2 Learning Path Engine ─┘   (certificates + trust)    │       │
│  (Ollama syllabus gen)                                   │       │
│                                                          │       │
│                                    ┌─────────────────────┘       │
│                                    │                             │
│                                    ▼                             │
│                         [Session Infrastructure]                 │
│                         (existing SessionRoom)                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ powers
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE & MOAT (Days 3–4)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Admin moderation + fraud detection                              │
│  Notifications + digest emails                                   │
│  Analytics & impact dashboard (extend existing)                  │
│  PWA + offline mode                                              │
│  Security hardening (rate limits, input validation)              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

# Chunked Units of Work

## Unit A: Tier 0 AI Foundation (Days 1–1.5)
**Goal:** Establish the Ollama + Embedding layer as a platform service  
**Parallelizable:** All 5 features can be worked on simultaneously (they use the same underlying APIs)

### Features:
1. **2.1 Skill-Gap Analyzer**
2. **2.5 Session → Flashcards/Quiz/Action Items**
3. **2.3 Tutor Bot**
4. **2.6 Semantic Search**
5. **2.13 Profile Assistant**

### Shared Infrastructure (implement once):
- **`AiPromptTemplateService`** — centralized Ollama prompt management (versioning, fallbacks)
- **`EmbeddingSearchService`** — wrapper around existing embedding pipeline for semantic search
- **Extended `NoteGenerationService`** — add flashcard/quiz/action-item generation endpoints
- **New `AiGateway` Controller** — unified `/api/ai/*` endpoints for all Ollama calls
- **Caching layer** — Redis or in-memory cache for expensive Ollama calls (e.g., gap analysis, flashcards)

### Success Criteria:
- Each feature has a working API endpoint + Frontend UI
- Ollama is called only once per session artifact (cached thereafter)
- Prompts are version-controlled and easy to tweak
- No external API keys required

### Blockers: None (can start immediately)

---

## Unit B: Tier 1 Orchestration (Days 2–2.5)
**Goal:** Build learning experiences that orchestrate Tier 0 data into workflows  
**Parallelizable:** Learning Paths + Chain Orchestration can run in parallel; Group Sessions can start after Session infrastructure review

### Features:
1. **1.2 AI Learning Paths** (goal skill → ordered steps + auto-matched mentors)
2. **2.2 Learning Path Generator** (Ollama syllabus engine)
3. **1.1 Skill Chain Auto-Orchestration** (multi-party sync + chain room)
4. **1.3 Group Sessions** (one-to-many teaching)
5. **2.4 AI Skill Assessment** (quiz generation + credible certificates)

### Shared Infrastructure:
- **`LearningPathService`** — orchestrate Skill-Gap → Path steps → Mentor matching
- **`ChainRoomService`** — manage multi-party session rooms (extends existing Session)
- **`GroupSessionService`** — coordinate one-to-many sessions (extends Session + Event)
- **`SkillAssessmentService`** — generate quizzes, grade responses, feed trust scores
- **`PathSchedulingService`** — coordinate auto-matching and session booking across path steps

### Success Criteria:
- A user can request "learn Python in 4 weeks" and see an ordered plan with mentors
- Chain rooms sync all participants through a WebSocket channel
- Group sessions show attendance + shared notes
- AI assessment questions grade free-text answers
- Each path step auto-books when prerequisites are met

### Blockers: 
- Unit A must be complete (AI prompts + templates)
- Session infrastructure review (ensure multi-party support)

---

## Unit C: Infrastructure & Moat (Days 3–4)
**Goal:** Harden, secure, and monitor the platform; build defensibility  
**Parallelizable:** Most features are orthogonal; only Security depends on complete feature list

### Features:
1. **Admin moderation** (extend existing `ModerationAiAssistService`)
2. **Notifications** (WebSocket + email digests)
3. **Analytics & impact dashboard** (extend existing `AnalyticsService`)
4. **PWA + offline mode** (Vite + Workbox)
5. **Security hardening** (rate limits, input validation, CSP)

### Shared Infrastructure:
- **`NotificationQueue`** — Redis/in-memory queue for real-time + batch notifications
- **`AuditLogger`** — track all AI-generated content + user actions
- **`RateLimitMiddleware`** — protect API endpoints from abuse
- **`ContentModerationPipeline`** — async moderation of user-generated content + AI responses
- **`OfflineCache`** — Service Worker strategy for offline skill browsing + session artifacts

### Success Criteria:
- Admins can moderate AI-generated content + user reports in real time
- Users get real-time notifications + daily digests
- Analytics dashboard shows learning outcomes (path completions, certificate velocity)
- App works offline for read operations
- API has rate limits + input validation

### Blockers: 
- Units A + B complete (full feature list to monitor)

---

# Tier 0: Quick Wins (5 features)

## 2.1: Skill-Gap Analyzer

### Purpose
User provides current skills + target skill → System suggests the minimum prerequisite skills needed to reach that goal, ranked by similarity.

### User Experience
1. Navigate to `/dashboard/skill-gap`
2. Select current skills (multi-select) + target skill
3. Click "Analyze Gap"
4. See: "You're 3 skills away: [Python, Statistics, SQL] with mentors for each"
5. Click "Find Mentors" for each gap skill → auto-route to Match page

### Backend API Endpoints

```
POST /api/ai/skill-gap-analysis
Content-Type: application/json

{
  "currentSkillIds": ["skill-uuid-1", "skill-uuid-2"],
  "targetSkillId": "skill-uuid-target",
  "depth": "full" // or "quick" for lite analysis
}

Response (200):
{
  "targetSkill": {
    "id": "...",
    "name": "Data Analyst",
    "description": "..."
  },
  "currentSkills": [
    { "id": "...", "name": "Excel", "proficiencyLevel": "INTERMEDIATE" }
  ],
  "gaps": [
    {
      "skillId": "...",
      "skillName": "Python",
      "similarity": 0.92,
      "rationale": "Python is essential for data analysis automation...",
      "mentorCount": 12,
      "estimatedHours": 20
    },
    {
      "skillId": "...",
      "skillName": "SQL",
      "similarity": 0.88,
      "rationale": "Most data analyst roles require database querying...",
      "mentorCount": 8,
      "estimatedHours": 15
    }
  ],
  "summary": "You're 2 core skills away from becoming a Data Analyst. Learn Python for automation & SQL for databases.",
  "generatedAt": "2025-06-11T10:30:00Z"
}
```

### Database Schema

**New Table: `skill_gap_analyses`**
```sql
CREATE TABLE IF NOT EXISTS skill_gap_analyses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  current_skills JSON NOT NULL,  -- array of skill IDs
  target_skill_id VARCHAR(36) NOT NULL,
  gap_results JSON NOT NULL,     -- cached analysis (skill IDs + rationales)
  summary TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_skill_id) REFERENCES skills(id),
  INDEX idx_user_target (user_id, target_skill_id),
  INDEX idx_created (created_at)
);
```

### Frontend Pages & Components

**Page:** `frontend/src/features/learning/pages/SkillGapAnalyzerPage.tsx`

```tsx
// Route: /dashboard/skill-gap
export const SkillGapAnalyzerPage = () => {
  const [currentSkills, setCurrentSkills] = useState<Skill[]>([]);
  const [targetSkill, setTargetSkill] = useState<Skill | null>(null);
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await SkillGapService.analyze({
      currentSkillIds: currentSkills.map(s => s.id),
      targetSkillId: targetSkill!.id,
    });
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Skill-Gap Analyzer</CardTitle>
          <CardDescription>
            Find the minimum skills needed to reach your goal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current Skills Multi-Select */}
          <div>
            <Label>Your Current Skills</Label>
            <SkillMultiSelect 
              value={currentSkills}
              onChange={setCurrentSkills}
              placeholder="Select skills you already have"
            />
          </div>

          {/* Target Skill Select */}
          <div>
            <Label>Target Skill / Goal</Label>
            <SkillSelect
              value={targetSkill}
              onChange={setTargetSkill}
              placeholder="What do you want to learn?"
            />
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={!targetSkill || currentSkills.length === 0 || loading}
            size="lg"
          >
            {loading ? <Spinner /> : "Analyze Gap"}
          </Button>

          {/* Results */}
          {analysis && (
            <SkillGapResultsPanel analysis={analysis} />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};
```

**Component:** `frontend/src/features/learning/components/SkillGapResultsPanel.tsx`

```tsx
export const SkillGapResultsPanel = ({ analysis }: { analysis: SkillGapAnalysis }) => {
  return (
    <div className="space-y-6 border-t pt-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Gap Summary</AlertTitle>
        <AlertDescription>{analysis.summary}</AlertDescription>
      </Alert>

      <div>
        <h3 className="text-lg font-semibold mb-4">Skill Gaps ({analysis.gaps.length})</h3>
        <div className="space-y-3">
          {analysis.gaps.map((gap) => (
            <GapSkillCard key={gap.skillId} gap={gap} />
          ))}
        </div>
      </div>
    </div>
  );
};

const GapSkillCard = ({ gap }: { gap: SkillGap }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold">{gap.skillName}</h4>
            <p className="text-sm text-muted-foreground">{gap.rationale}</p>
          </div>
          <Badge variant="outline">{Math.round(gap.similarity * 100)}% match</Badge>
        </div>
        
        <div className="flex justify-between items-center pt-3">
          <span className="text-xs text-muted-foreground">
            ~{gap.estimatedHours}h • {gap.mentorCount} mentors available
          </span>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate(`/match?skill=${gap.skillId}`)}
          >
            Find Mentors →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

### Implementation Steps

1. **Backend Service** (`AiPromptTemplateService`):
   - Create versioned Ollama prompt for gap analysis
   - Template: "Given current skills [list], target skill [name], and all skills in catalog [list with embeddings], rank the top 3–5 minimum prerequisites. For each, explain why it's essential and estimate hours."
   - Cache results in `skill_gap_analyses` table

2. **Controller** (`AiController.java`):
   - Endpoint: `POST /api/ai/skill-gap-analysis`
   - Validate current skills exist
   - Call `AiPromptTemplateService.analyzeSkillGap()`
   - Return structured response

3. **Frontend**:
   - Build multi-select + single-select for skills
   - Call `POST /api/ai/skill-gap-analysis`
   - Display results with mentors count per gap
   - Link each gap to Match page pre-filtered by skill

### Ollama Prompt Template

```
You are an expert curriculum designer for skill development.

Current User Skills:
{CURRENT_SKILLS_LIST}

Target Skill (Goal):
{TARGET_SKILL_NAME}
{TARGET_SKILL_DESCRIPTION}

All Available Skills in System:
{ALL_SKILLS_WITH_DESCRIPTIONS}

Task: Identify the minimum set of prerequisite skills the user must learn to competently reach the target skill. For each gap skill, rank by similarity and explain briefly why it's essential.

Output as JSON:
{
  "gaps": [
    {
      "skillName": "...",
      "rationale": "...",
      "estimatedHours": <number>,
      "confidenceScore": <0.0-1.0>
    }
  ],
  "summary": "..."
}
```

### Type Definitions

```typescript
// frontend/src/types/skill-gap.ts

export interface SkillGapAnalysis {
  targetSkill: Skill;
  currentSkills: Skill[];
  gaps: SkillGap[];
  summary: string;
  generatedAt: string;
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  similarity: number;        // 0.0-1.0, from embedding distance
  rationale: string;
  mentorCount: number;
  estimatedHours: number;
}

export interface SkillGapRequest {
  currentSkillIds: string[];
  targetSkillId: string;
  depth?: 'quick' | 'full';
}
```

### Success Criteria

- [ ] User selects current skills + target, gets gap list in < 2 seconds
- [ ] Each gap has a "Find Mentors" link that pre-filters Match page
- [ ] Results are cached (same request within 24h returns cache)
- [ ] Ollama prompt handles edge cases (no gaps, target = current, empty profile)
- [ ] Mobile-responsive UI

---

## 2.5: Session → Flashcards / Quiz / Action Items

### Purpose
Extend the AI note generation to also emit spaced-repetition flashcards, a mini-quiz, and action items with follow-up reminders.

### User Experience
1. Session ends → AI notes are generated
2. User sees "Notes" tab + new "Flashcards" tab + "Mini-Quiz" tab
3. Clicks "Flashcards" → sees 5–10 cards with question on front, answer on back
4. Clicks "Quiz" → answers 3 questions; AI grades and explains
5. Clicks "Action Items" → sees numbered TODOs with due dates
6. Recurring reminder: "Review your flashcards for Data Analysis session"

### Backend API Endpoints

```
GET /api/sessions/{sessionId}/artifacts
Response (200):
{
  "sessionId": "...",
  "notes": { ... existing SessionNote ... },
  "flashcards": {
    "cards": [
      {
        "id": "uuid",
        "question": "What is a hypothesis test?",
        "answer": "A statistical method to...",
        "skillId": "...",
        "difficulty": "INTERMEDIATE",
        "createdAt": "..."
      }
    ],
    "generatedAt": "..."
  },
  "quiz": {
    "id": "uuid",
    "questions": [
      {
        "id": "q1",
        "question": "Fill in the blank: A p-value < ___ typically indicates...",
        "type": "FILL_BLANK",
        "correctAnswer": "0.05",
        "explanation": "..."
      }
    ],
    "generatedAt": "..."
  },
  "actionItems": [
    {
      "id": "uuid",
      "description": "Implement linear regression model in Python",
      "dueAt": "2025-06-18T00:00:00Z",
      "priority": "HIGH",
      "relatedFlashcardIds": ["card-1", "card-2"],
      "status": "PENDING"
    }
  ]
}

POST /api/sessions/{sessionId}/quiz/answers
Content-Type: application/json
{
  "answers": [
    { "questionId": "q1", "userAnswer": "0.05" },
    { "questionId": "q2", "userAnswer": "The distribution of..." }
  ]
}

Response (200):
{
  "quizId": "...",
  "score": 66,  // percentage
  "results": [
    {
      "questionId": "q1",
      "correct": true,
      "explanation": "Correct! P-values below 0.05..."
    },
    {
      "questionId": "q2",
      "correct": false,
      "userAnswer": "...",
      "correctAnswer": "...",
      "explanation": "Not quite. The correct answer emphasizes..."
    }
  ],
  "generatedAt": "..."
}
```

### Database Schema

**New Tables:**

```sql
CREATE TABLE IF NOT EXISTS session_flashcards (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer LONGTEXT NOT NULL,
  difficulty ENUM('EASY', 'INTERMEDIATE', 'HARD') DEFAULT 'INTERMEDIATE',
  ease_factor FLOAT DEFAULT 2.5,           -- for Anki-style spacing
  reviews_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMP NULL,
  next_review_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  INDEX idx_session (session_id),
  INDEX idx_next_review (next_review_at)
);

CREATE TABLE IF NOT EXISTS session_quizzes (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE IF NOT EXISTS session_quiz_questions (
  id VARCHAR(36) PRIMARY KEY,
  quiz_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  type ENUM('MULTIPLE_CHOICE', 'FILL_BLANK', 'FREE_TEXT') NOT NULL,
  correct_answer TEXT,
  explanation LONGTEXT,
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES session_quizzes(id) ON DELETE CASCADE,
  INDEX idx_quiz (quiz_id)
);

CREATE TABLE IF NOT EXISTS session_quiz_answers (
  id VARCHAR(36) PRIMARY KEY,
  quiz_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(36) NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN,
  score INT DEFAULT 0,
  graded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES session_quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES session_quiz_questions(id),
  INDEX idx_user_quiz (user_id, quiz_id)
);

CREATE TABLE IF NOT EXISTS session_action_items (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  due_at TIMESTAMP,
  priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
  status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED') DEFAULT 'PENDING',
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  INDEX idx_session_status (session_id, status)
);

CREATE TABLE IF NOT EXISTS flashcard_skill_relations (
  flashcard_id VARCHAR(36) NOT NULL,
  action_item_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (flashcard_id, action_item_id),
  FOREIGN KEY (flashcard_id) REFERENCES session_flashcards(id) ON DELETE CASCADE,
  FOREIGN KEY (action_item_id) REFERENCES session_action_items(id) ON DELETE CASCADE
);
```

### Frontend Pages & Components

**Page:** `frontend/src/features/sessions/pages/SessionArtifactsPage.tsx`

```tsx
// Route: /sessions/{sessionId}/artifacts
export const SessionArtifactsPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [artifacts, setArtifacts] = useState<SessionArtifacts | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'quiz' | 'actions'>('notes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SessionService.getArtifacts(sessionId!).then(setArtifacts).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <Spinner />;
  if (!artifacts) return <NotFound />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Session Learning Materials</h1>
          <SessionBreadcrumb sessionId={sessionId!} />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="flashcards">
              Flashcards ({artifacts.flashcards.cards.length})
            </TabsTrigger>
            <TabsTrigger value="quiz">Mini-Quiz</TabsTrigger>
            <TabsTrigger value="actions">
              Action Items ({artifacts.actionItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes">
            <SessionNotesTab notes={artifacts.notes} />
          </TabsContent>

          <TabsContent value="flashcards">
            <FlashcardsTab flashcards={artifacts.flashcards} />
          </TabsContent>

          <TabsContent value="quiz">
            <QuizTab quiz={artifacts.quiz} sessionId={sessionId!} />
          </TabsContent>

          <TabsContent value="actions">
            <ActionItemsTab items={artifacts.actionItems} sessionId={sessionId!} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
```

**Component:** `frontend/src/features/learning/components/FlashcardsTab.tsx`

```tsx
export const FlashcardsTab = ({ flashcards }: { flashcards: FlashcardCollection }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);

  const cards = dueOnly 
    ? flashcards.cards.filter(c => !c.nextReviewAt || new Date(c.nextReviewAt) <= new Date())
    : flashcards.cards;

  const current = cards[currentIndex];

  if (cards.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No flashcards yet</AlertTitle>
        <AlertDescription>
          AI will generate flashcards from your session notes.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Flashcard {currentIndex + 1} of {cards.length}
        </h3>
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={dueOnly}
            onChange={(e) => {
              setDueOnly(e.target.checked);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
          />
          <span className="text-sm">Due for review only</span>
        </label>
      </div>

      {/* Flashcard Flipper */}
      <div 
        className={`h-64 cursor-pointer rounded-lg border-2 border-slate-300 p-8 flex items-center justify-center transition-all ${ isFlipped ? 'bg-blue-50' : 'bg-white' }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            {isFlipped ? 'Answer' : 'Question'}
          </p>
          <p className="text-xl font-medium">
            {isFlipped ? current.answer : current.question}
          </p>
        </div>
      </div>

      {/* Navigation & Feedback */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          ← Previous
        </Button>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => handleCardFeedback(current.id, 'hard')}
          >
            😕 Hard
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => handleCardFeedback(current.id, 'good')}
          >
            😐 Good
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => handleCardFeedback(current.id, 'easy')}
          >
            😊 Easy
          </Button>
        </div>

        <Button 
          variant="outline"
          onClick={() => setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1))}
          disabled={currentIndex === cards.length - 1}
        >
          Next →
        </Button>
      </div>

      {/* Progress Bar */}
      <Progress value={((currentIndex + 1) / cards.length) * 100} />
    </Card>
  );
};
```

### Implementation Steps

1. **Extend `NoteGenerationService`**:
   - After generating notes, call new methods:
     - `generateFlashcards(transcript, notes)` → list of Q&A pairs
     - `generateQuiz(transcript, notes)` → structured questions
     - `generateActionItems(transcript, notes)` → TODOs with due dates

2. **New Service**: `FlashcardService.java`
   - Save flashcards to DB
   - Implement Anki-style spaced repetition (SM-2 algorithm) for `ease_factor` + `nextReviewAt`
   - Endpoint to record user feedback ("hard"/"good"/"easy") and update scheduling

3. **New Service**: `QuizGradingService.java`
   - Store user answers
   - Call Ollama to grade free-text questions
   - Return score + explanations

4. **New Service**: `ActionItemService.java`
   - Create action items linked to session
   - Integrate with notification system to remind users

5. **Frontend Components**:
   - FlashcardsTab: Card flipper with Anki-style controls
   - QuizTab: Question display + answer input + grade display
   - ActionItemsTab: Checklist with due dates

### Ollama Prompt Templates

**Flashcard Generation:**
```
Given the following session transcript and AI-generated notes, create 5-10 spaced-repetition flashcards that reinforce key concepts.

Transcript:
{TRANSCRIPT}

Notes:
{SUMMARY}
{KEY_CONCEPTS}

Output as JSON:
{
  "flashcards": [
    {
      "question": "...",
      "answer": "...",
      "difficulty": "EASY|INTERMEDIATE|HARD"
    }
  ]
}
```

**Quiz Generation:**
```
Create a 3-question mini-quiz to test understanding of the key concepts from this session. Mix question types (fill-blank, free-text, multiple choice).

Key Concepts:
{KEY_CONCEPTS}

Transcript excerpt:
{TRANSCRIPT_EXCERPT}

Output as JSON:
{
  "questions": [
    {
      "question": "...",
      "type": "FILL_BLANK|FREE_TEXT|MULTIPLE_CHOICE",
      "correctAnswer": "...",
      "explanation": "..."
    }
  ]
}
```

**Action Items Generation:**
```
Extract 3-5 concrete action items the learner should complete before the next session. Frame them as specific, measurable tasks.

Session Summary:
{SUMMARY}

Key Concepts:
{KEY_CONCEPTS}

Output as JSON:
{
  "actionItems": [
    {
      "description": "...",
      "estimatedMinutes": <number>,
      "priority": "LOW|MEDIUM|HIGH"
    }
  ]
}
```

### Type Definitions

```typescript
// frontend/src/types/session-artifacts.ts

export interface SessionArtifacts {
  sessionId: string;
  notes: SessionNote;
  flashcards: FlashcardCollection;
  quiz: SessionQuiz;
  actionItems: ActionItem[];
}

export interface FlashcardCollection {
  cards: Flashcard[];
  generatedAt: string;
}

export interface Flashcard {
  id: string;
  sessionId: string;
  skillId: string;
  question: string;
  answer: string;
  difficulty: 'EASY' | 'INTERMEDIATE' | 'HARD';
  easeFactor: number;        // Anki SM-2
  reviewsCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
}

export interface SessionQuiz {
  id: string;
  sessionId: string;
  questions: QuizQuestion[];
  generatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'FREE_TEXT';
  correctAnswer: string;
  explanation: string;
  displayOrder: number;
}

export interface ActionItem {
  id: string;
  sessionId: string;
  description: string;
  dueAt?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  completedAt?: string;
  relatedFlashcardIds: string[];
}
```

### Success Criteria

- [ ] After session completion, notes + flashcards + quiz are generated automatically
- [ ] Flashcard UI supports flipping and Anki-style spacing
- [ ] Quiz can grade free-text answers using Ollama
- [ ] Action items show due dates and can be marked complete
- [ ] Notifications remind users to review flashcards daily

---

## 2.3: Tutor Bot

### Purpose
A per-skill Ollama chatbot that lives between sessions. Users can ask questions, get explanations, and quiz themselves while waiting for their next mentor session.

### User Experience
1. User enters `/dashboard/tutor`
2. Selects a skill they're learning
3. Converses with a friendly bot: "How does photosynthesis work?" → bot explains
4. Bot can also quiz: "Quick check—what are the 2 products of photosynthesis?"
5. Chat history is saved; users can resume conversations

### Backend API Endpoints

```
GET /api/ai/tutor/conversations?skillId=...
Response (200):
{
  "conversations": [
    {
      "id": "uuid",
      "skillId": "...",
      "skillName": "...",
      "lastMessageAt": "...",
      "messageCount": 5,
      "createdAt": "..."
    }
  ]
}

POST /api/ai/tutor/conversations
{
  "skillId": "..."
}
Response (201):
{
  "conversationId": "uuid",
  "initialMessage": "Hi! I'm your tutor for [Skill Name]. What would you like to learn about?"
}

GET /api/ai/tutor/conversations/{conversationId}/messages
Response (200):
{
  "conversationId": "...",
  "skill": { ... },
  "messages": [
    { "role": "user", "content": "What is...", "createdAt": "..." },
    { "role": "assistant", "content": "...", "createdAt": "..." }
  ]
}

POST /api/ai/tutor/conversations/{conversationId}/message
{
  "content": "Can you explain the difference between..."
}
Response (200):
{
  "message": {
    "role": "assistant",
    "content": "Great question! ...",
    "type": "EXPLANATION|QUIZ_QUESTION|CLARIFICATION",
    "followUpSuggestions": ["Ask about X", "Try this quiz"]
  }
}
```

### Database Schema

**Use existing `AiHelperConversation` (already in codebase) but extend:**

```sql
-- Verify AiHelperConversation table structure:
-- CREATE TABLE ai_helper_conversations (
--   id VARCHAR(36) PRIMARY KEY,
--   user_id VARCHAR(36) NOT NULL,
--   skill_id VARCHAR(36),
--   context TEXT,
--   created_at TIMESTAMP,
--   ...
-- );

-- Add field if missing:
ALTER TABLE ai_helper_conversations 
ADD COLUMN IF NOT EXISTS tutor_mode BOOLEAN DEFAULT FALSE;

-- Create companion table for structured tutor context:
CREATE TABLE IF NOT EXISTS tutor_conversation_context (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  topic TEXT,
  difficulty_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') DEFAULT 'BEGINNER',
  user_goals TEXT,
  learning_style TEXT,
  last_quiz_score INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES ai_helper_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  UNIQUE KEY unique_active (conversation_id, skill_id)
);
```

### Frontend Pages & Components

**Page:** `frontend/src/features/learning/pages/TutorBotPage.tsx`

```tsx
// Route: /dashboard/tutor
export const TutorBotPage = () => {
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [activeConversation, setActiveConversation] = useState<TutorConversation | null>(null);

  useEffect(() => {
    TutorService.listConversations().then(setConversations);
  }, []);

  const handleSelectSkill = async (skill: Skill) => {
    setSelectedSkill(skill);
    let conversation = conversations.find(c => c.skillId === skill.id);
    
    if (!conversation) {
      conversation = await TutorService.startConversation(skill.id);
      setConversations([...conversations, conversation]);
    }
    
    setActiveConversation(conversation);
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-100px)]">
        
        {/* Sidebar: Skill Selection */}
        <div className="col-span-1 border-r">
          <div className="space-y-4 p-4">
            <h3 className="font-semibold">Your Skills</h3>
            <SkillSelect 
              onSelect={handleSelectSkill}
              placeholder="Pick a skill to tutor"
            />
            
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div 
                  key={conv.id}
                  className={`p-3 cursor-pointer rounded-lg transition ${
                    activeConversation?.id === conv.id 
                      ? 'bg-blue-100' 
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => setActiveConversation(conv)}
                >
                  <p className="font-medium text-sm">{conv.skillName}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.messageCount} messages
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="col-span-2">
          {activeConversation ? (
            <TutorChatWindow conversation={activeConversation} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a skill to start tutoring
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
```

**Component:** `frontend/src/features/learning/components/TutorChatWindow.tsx`

```tsx
export const TutorChatWindow = ({ conversation }: { conversation: TutorConversation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    TutorService.getMessages(conversation.id).then(setMessages);
  }, [conversation.id]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user' as const, content: input, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await TutorService.sendMessage(conversation.id, input);
      setMessages(prev => [...prev, response]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-md rounded-lg p-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              {msg.type === 'QUIZ_QUESTION' && (
                <p className="text-xs mt-2 opacity-75">
                  📝 Quick check question
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 space-y-3">
        {/* Quick Suggestions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline">
            📝 Give me a quiz
          </Button>
          <Button size="sm" variant="outline">
            ❓ Ask me anything
          </Button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your tutor..."
            disabled={loading}
            className="flex-1 rounded-lg border p-2"
          />
          <Button onClick={handleSend} disabled={!input.trim() || loading}>
            {loading ? <Spinner /> : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### Implementation Steps

1. **Extend `ContextualHelpService`** (already exists in codebase):
   - Add tutor-specific prompts
   - Track conversation state (topic, difficulty, goals)
   - Implement follow-up suggestion generation

2. **New Endpoint in `AiHelperController`**:
   - `GET /api/ai/tutor/conversations`
   - `POST /api/ai/tutor/conversations`
   - `POST /api/ai/tutor/conversations/{id}/message`

3. **Frontend**:
   - Skill selector sidebar
   - Chat message display
   - Send/receive UI

### Ollama Prompt Template

```
You are a friendly, patient tutor for the skill: {SKILL_NAME}

User skill level: {PROFICIENCY_LEVEL}
Learner goals: {USER_GOALS}

Guidelines:
- Explain concepts clearly with examples
- Break complex topics into steps
- Ask clarifying questions if needed
- Occasionally suggest a quick quiz ("Want to test what you've learned?")
- Use encouraging language
- Keep responses focused and concise

User message:
{USER_MESSAGE}

Previous conversation (last 3 exchanges):
{CONVERSATION_HISTORY}

Respond as a tutor. If appropriate, also suggest a follow-up question or quiz.
```

### Type Definitions

```typescript
// frontend/src/types/tutor.ts

export interface TutorConversation {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'EXPLANATION' | 'QUIZ_QUESTION' | 'CLARIFICATION';
  followUpSuggestions?: string[];
  createdAt: string;
}
```

### Success Criteria

- [ ] User can start a tutor conversation for any skill
- [ ] Bot maintains context across messages (remembers user's level, goals)
- [ ] Bot occasionally offers quizzes to test understanding
- [ ] Chat history persists and can be resumed
- [ ] Response time < 3 seconds

---

## 2.6: Semantic Search

### Purpose
Replace keyword-based search with embedding-based semantic search across mentors, skills, discussions, and circles.

### User Experience
1. Click search bar on any page
2. Type "machine learning for beginners"
3. See results ranked by semantic relevance: Mentors (ML experts), Skills (ML + foundational), Discussions (ML content), Circles (ML communities)
4. Search is real-time as user types

### Backend API Endpoints

```
GET /api/search/semantic?q=machine+learning+for+beginners&types=MENTOR,SKILL,DISCUSSION
Response (200):
{
  "query": "machine learning for beginners",
  "results": {
    "mentors": [
      {
        "userId": "...",
        "name": "...",
        "similarity": 0.95,
        "skills": [{ "id": "...", "name": "Machine Learning" }],
        "rating": 4.8,
        "sessionsCompleted": 23
      }
    ],
    "skills": [
      {
        "id": "...",
        "name": "Machine Learning",
        "similarity": 0.98,
        "description": "...",
        "mentorsCount": 12
      }
    ],
    "discussions": [
      {
        "id": "...",
        "title": "Getting started with ML",
        "similarity": 0.87,
        "author": "...",
        "replyCount": 5,
        "createdAt": "..."
      }
    ],
    "circles": [
      {
        "id": "...",
        "name": "ML Enthusiasts",
        "similarity": 0.89,
        "memberCount": 45,
        "description": "..."
      }
    ]
  },
  "executedAt": "..."
}
```

### Database Schema

**No new tables needed** — leverage existing `skill_embeddings` and add search indices:

```sql
-- Ensure embeddings are indexed for fast search:
CREATE INDEX IF NOT EXISTS idx_skill_embeddings_vec 
ON skill_embeddings(skill_id);

-- Track search queries for analytics:
CREATE TABLE IF NOT EXISTS search_queries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  query TEXT NOT NULL,
  result_count INT,
  execution_time_ms INT,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_searched (user_id, searched_at)
);
```

### Frontend Components

**Component:** `frontend/src/components/search/GlobalSearch.tsx` (enhance existing)

```tsx
export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSearch = async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const res = await SearchService.semanticSearch(q);
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative w-full max-w-md">
          <Input
            placeholder="Search mentors, skills, discussions..."
            className="pl-8"
            onClick={() => setOpen(true)}
          />
          <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Search Input */}
          <Input
            autoFocus
            placeholder="Search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
          />

          {/* Results */}
          {loading ? (
            <Spinner />
          ) : results ? (
            <SearchResultsTabs results={results} />
          ) : (
            <p className="text-muted-foreground text-center">
              Type to search mentors, skills, discussions, circles...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SearchResultsTabs = ({ results }: { results: SearchResults }) => {
  const total = Object.values(results.results).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({total})</TabsTrigger>
        <TabsTrigger value="mentors">Mentors ({results.results.mentors.length})</TabsTrigger>
        <TabsTrigger value="skills">Skills ({results.results.skills.length})</TabsTrigger>
        <TabsTrigger value="discussions">Discussions ({results.results.discussions.length})</TabsTrigger>
        <TabsTrigger value="circles">Circles ({results.results.circles.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-6">
        {results.results.mentors.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Mentors</h4>
            <div className="space-y-2">
              {results.results.mentors.slice(0, 3).map(m => (
                <MentorResultItem key={m.userId} mentor={m} />
              ))}
            </div>
          </div>
        )}
        {/* Similar for skills, discussions, circles */}
      </TabsContent>

      {/* Individual tabs */}
    </Tabs>
  );
};
```

### Implementation Steps

1. **New Service**: `SemanticSearchService.java`
   - Embed the search query
   - Find top-N mentors by user skill embeddings
   - Find top-N skills by embedding distance
   - Find top-N discussions by title/content embedding
   - Find top-N circles by description embedding

2. **Controller**: `SearchController.java`
   - `GET /api/search/semantic?q=...&types=...`
   - Filter results by type parameter
   - Rank by similarity score

3. **Frontend**: Enhance existing `GlobalSearch` component
   - Add semantic search tab
   - Display multi-type results
   - Link results to detail pages

### Type Definitions

```typescript
// frontend/src/types/search.ts

export interface SearchResults {
  query: string;
  results: {
    mentors: MentorSearchResult[];
    skills: SkillSearchResult[];
    discussions: DiscussionSearchResult[];
    circles: CircleSearchResult[];
  };
  executedAt: string;
}

export interface MentorSearchResult {
  userId: string;
  name: string;
  similarity: number;
  skills: Skill[];
  rating: number;
  sessionsCompleted: number;
}

export interface SkillSearchResult {
  id: string;
  name: string;
  similarity: number;
  description: string;
  mentorsCount: number;
}

export interface DiscussionSearchResult {
  id: string;
  title: string;
  similarity: number;
  author: string;
  replyCount: number;
  createdAt: string;
}

export interface CircleSearchResult {
  id: string;
  name: string;
  similarity: number;
  memberCount: number;
  description: string;
}
```

### Success Criteria

- [ ] Search results appear in < 500ms
- [ ] Results are ranked by semantic similarity (not keyword matching)
- [ ] All 4 result types (mentor, skill, discussion, circle) appear
- [ ] Mobile-responsive
- [ ] Search analytics are logged for trending queries

---

## 2.13: AI Profile Assistant

### Purpose
Generate polished skill descriptions, bios, and circle/event blurbs from a few user-provided keywords.

### User Experience
1. User clicks "Generate with AI" on skill add form
2. Types: "python, data analysis, beginner"
3. Gets a polished description: "Python is a versatile programming language widely used in data analysis..."
4. Edits if needed, saves

### Backend API Endpoints

```
POST /api/ai/generate-description
Content-Type: application/json
{
  "type": "SKILL_DESCRIPTION" | "USER_BIO" | "CIRCLE_BLURB" | "EVENT_DESCRIPTION",
  "keywords": ["keyword1", "keyword2"],
  "context": "optional additional context",
  "length": "SHORT" | "MEDIUM" | "LONG"
}

Response (200):
{
  "generated": "A polished description...",
  "alternatives": [
    "Alternative 1...",
    "Alternative 2..."
  ],
  "generatedAt": "..."
}
```

### Database Schema

**Optional logging table:**

```sql
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  content_type ENUM('SKILL_DESC', 'USER_BIO', 'CIRCLE_BLURB', 'EVENT_DESC'),
  generated_text LONGTEXT NOT NULL,
  keywords JSON,
  user_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_id, content_type)
);
```

### Frontend Component

**Component:** `frontend/src/components/ai/DescriptionGenerator.tsx`

```tsx
export const DescriptionGenerator = ({
  type,
  onSelect,
}: {
  type: 'SKILL' | 'BIO' | 'CIRCLE' | 'EVENT';
  onSelect: (text: string) => void;
}) => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [generated, setGenerated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await AiService.generateDescription({
        type,
        keywords,
        length: 'MEDIUM',
      });
      setGenerated(result.generated);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          ✨ Generate with AI
        </Button>
      </DialogTrigger>

      <DialogContent>
        <div className="space-y-4">
          <h3 className="font-semibold">Generate {type} Description</h3>

          <div>
            <Label>Keywords (enter and press Enter)</Label>
            <KeywordInput
              keywords={keywords}
              onChange={setKeywords}
            />
          </div>

          {generated && (
            <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Generated description:</p>
              <p className="text-sm">{generated}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate}
              disabled={keywords.length === 0 || loading}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
            {generated && (
              <Button 
                variant="default"
                onClick={() => onSelect(generated)}
              >
                Use This
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### Implementation Steps

1. **New Endpoint in `AiController`**:
   - `POST /api/ai/generate-description`
   - Call Ollama with type-specific prompt
   - Return generated text + alternatives

2. **Frontend**: Add button to forms (skill add, user bio edit, circle create, event create)

### Ollama Prompt Template

```
You are a skilled content writer. Generate a polished, professional description based on the keywords provided.

Type: {CONTENT_TYPE}
Keywords: {KEYWORDS}
Additional context: {CONTEXT}
Desired length: {LENGTH}

Rules:
- Write naturally, not as a list
- Include practical details
- Be encouraging and clear
- Avoid jargon unless necessary

{CONTENT_TYPE} description:
```

### Type Definitions

```typescript
export interface DescriptionGeneratorRequest {
  type: 'SKILL_DESCRIPTION' | 'USER_BIO' | 'CIRCLE_BLURB' | 'EVENT_DESCRIPTION';
  keywords: string[];
  context?: string;
  length?: 'SHORT' | 'MEDIUM' | 'LONG';
}

export interface DescriptionGeneratorResponse {
  generated: string;
  alternatives: string[];
  generatedAt: string;
}
```

### Success Criteria

- [ ] Generated descriptions are professional and natural
- [ ] API response < 2 seconds
- [ ] User can edit generated text before saving
- [ ] Works for all 4 content types

---

# Tier 1: Flagship Features (4 features)

## 1.2: AI Learning Paths

### Purpose
User picks a goal skill → System generates an ordered, multi-step learning path and auto-matches mentors/chains for each step, scheduling them as a sequence.

### User Experience
1. Navigate to `/dashboard/learning-paths`
2. Create new path: "I want to learn Python for Data Analysis in 4 weeks"
3. System generates: "Week 1: Basics (Intro to Python + Data Types), Week 2: Libraries (NumPy, Pandas), Week 3: Analysis (SQL), Week 4: Projects"
4. For each step, system auto-suggests mentors & books sessions
5. User sees roadmap with progress tracking
6. Completes steps in order; system tracks completion and suggests next

### Backend API Endpoints

```
POST /api/learning-paths
{
  "goalSkillId": "...",
  "learnerGoal": "I want to learn Python for data analysis",
  "targetLevel": "INTERMEDIATE",
  "timelineWeeks": 4,
  "preferredSessionDuration": 60
}

Response (201):
{
  "pathId": "uuid",
  "goalSkill": { ... },
  "steps": [
    {
      "stepId": "uuid",
      "stepNumber": 1,
      "title": "Python Fundamentals",
      "description": "Core concepts, data types, control flow",
      "relatedSkills": [
        { "id": "...", "name": "Python", "priority": "PRIMARY" },
        { "id": "...", "name": "Programming Basics", "priority": "FOUNDATION" }
      ],
      "estimatedHours": 12,
      "successCriteria": "Understand variables, loops, functions",
      "suggestedMentors": [
        { "userId": "...", "name": "...", "matchScore": 0.95 }
      ],
      "status": "PENDING",
      "sessionsNeeded": 2,
      "sessionBookings": [
        {
          "sessionId": "...",
          "mentorId": "...",
          "scheduledAt": "...",
          "status": "SCHEDULED"
        }
      ]
    },
    {
      "stepNumber": 2,
      "title": "Data Analysis Libraries",
      ...
    }
  ],
  "totalEstimatedHours": 48,
  "estimatedCompletion": "2025-07-09",
  "createdAt": "...",
  "pathStatus": "ACTIVE"
}

GET /api/learning-paths?status=ACTIVE,COMPLETED
Response (200):
{
  "paths": [...]
}

GET /api/learning-paths/{pathId}
GET /api/learning-paths/{pathId}/progress
Response (200):
{
  "pathId": "...",
  "totalSteps": 4,
  "completedSteps": 1,
  "currentStep": 2,
  "overallProgress": 25,
  "nextMilestone": "...",
  "timeRemaining": "2 weeks",
  "isOnTrack": true
}

POST /api/learning-paths/{pathId}/steps/{stepId}/complete
Response (200):
{
  "stepId": "...",
  "completedAt": "...",
  "nextStepStartsAt": "..."
}

POST /api/learning-paths/{pathId}/steps/{stepId}/auto-book-sessions
Response (200):
{
  "sessionsBooked": 2,
  "sessions": [...]
}
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS learning_paths (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  goal_skill_id VARCHAR(36) NOT NULL,
  learner_goal TEXT,
  target_level VARCHAR(20),
  timeline_weeks INT,
  total_estimated_hours INT,
  estimated_completion_date DATE,
  status ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED') DEFAULT 'DRAFT',
  path_json LONGTEXT,  -- Full path structure (steps, mentors, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (goal_skill_id) REFERENCES skills(id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_completion (completed_at)
);

CREATE TABLE IF NOT EXISTS learning_path_steps (
  id VARCHAR(36) PRIMARY KEY,
  path_id VARCHAR(36) NOT NULL,
  step_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_hours INT,
  success_criteria TEXT,
  status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'PENDING',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
  UNIQUE KEY unique_path_step (path_id, step_number),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS learning_path_step_skills (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  step_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  priority ENUM('FOUNDATION', 'PRIMARY', 'SUPPLEMENTARY') DEFAULT 'PRIMARY',
  FOREIGN KEY (step_id) REFERENCES learning_path_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  UNIQUE KEY unique_step_skill (step_id, skill_id)
);

CREATE TABLE IF NOT EXISTS learning_path_step_sessions (
  id VARCHAR(36) PRIMARY KEY,
  step_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  session_order INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (step_id) REFERENCES learning_path_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_step_session (step_id, session_id)
);
```

### Frontend Pages & Components

**Page:** `frontend/src/features/learning/pages/LearningPathsPage.tsx`

```tsx
// Route: /dashboard/learning-paths
export const LearningPathsPage = () => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    LearningPathService.getPaths({ status: 'ACTIVE' }).then(setPaths);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Learning Paths</h1>
          <Button onClick={() => setShowCreator(true)}>
            + Create Path
          </Button>
        </div>

        {paths.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {paths.map((path) => (
              <LearningPathCard key={path.id} path={path} />
            ))}
          </div>
        )}
      </div>

      {showCreator && (
        <LearningPathCreator 
          onClose={() => setShowCreator(false)}
          onSuccess={(path) => setPaths([...paths, path])}
        />
      )}
    </DashboardLayout>
  );
};
```

**Component:** `frontend/src/features/learning/components/LearningPathCard.tsx`

```tsx
export const LearningPathCard = ({ path }: { path: LearningPath }) => {
  const navigate = useNavigate();
  const progress = (path.completedSteps / path.totalSteps) * 100;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition"
      onClick={() => navigate(`/dashboard/learning-paths/${path.id}`)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{path.goalSkill.name}</CardTitle>
            <CardDescription>{path.learnerGoal}</CardDescription>
          </div>
          <Badge variant="outline">{path.pathStatus}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              {path.completedSteps} of {path.totalSteps} steps
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Timeline */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Started: {formatDate(path.createdAt)}</span>
          <span>Est. done: {formatDate(path.estimatedCompletion)}</span>
        </div>

        {/* Current Step */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-sm font-medium">Current: {path.steps[path.currentStep - 1]?.title}</p>
          <p className="text-xs text-muted-foreground">
            {path.steps[path.currentStep - 1]?.estimatedHours}h
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
```

**Page:** `frontend/src/features/learning/pages/LearningPathDetailPage.tsx`

```tsx
// Route: /dashboard/learning-paths/{pathId}
export const LearningPathDetailPage = () => {
  const { pathId } = useParams<{ pathId: string }>();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [progress, setProgress] = useState<PathProgress | null>(null);

  useEffect(() => {
    Promise.all([
      LearningPathService.getPath(pathId!),
      LearningPathService.getProgress(pathId!),
    ]).then(([p, pr]) => {
      setPath(p);
      setProgress(pr);
    });
  }, [pathId]);

  if (!path || !progress) return <Spinner />;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{path.goalSkill.name}</h1>
          <p className="text-muted-foreground">{path.learnerGoal}</p>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{path.totalEstimatedHours}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{progress.completedSteps}/{progress.totalSteps}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{Math.round(progress.overallProgress)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className={`text-2xl font-bold ${progress.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                  {progress.isOnTrack ? '✓' : '!'}
                </p>
              </div>
            </div>
            <Progress value={progress.overallProgress} />
          </CardContent>
        </Card>

        {/* Steps Roadmap */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Learning Roadmap</h2>
          <div className="space-y-3">
            {path.steps.map((step, i) => (
              <LearningPathStepCard 
                key={step.stepId} 
                step={step} 
                isCurrentStep={i === progress.currentStep - 1}
                pathId={pathId!}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
```

**Component:** `frontend/src/features/learning/components/LearningPathStepCard.tsx`

```tsx
export const LearningPathStepCard = ({
  step,
  isCurrentStep,
  pathId,
}: {
  step: LearningPathStep;
  isCurrentStep: boolean;
  pathId: string;
}) => {
  const [showSessions, setShowSessions] = useState(false);
  const [booking, setBooking] = useState(false);

  const handleAutoBook = async () => {
    setBooking(true);
    try {
      await LearningPathService.autoBookSessions(pathId, step.stepId);
      toast.success('Sessions booked!');
    } finally {
      setBooking(false);
    }
  };

  return (
    <Card className={`${isCurrentStep ? 'border-blue-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              Step {step.stepNumber}: {step.title}
            </CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </div>
          <Badge 
            variant={step.status === 'COMPLETED' ? 'default' : 'outline'}
          >
            {step.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Related Skills */}
        <div>
          <p className="text-sm font-medium mb-2">Skills to Learn</p>
          <div className="flex flex-wrap gap-2">
            {step.relatedSkills.map((skill) => (
              <Badge key={skill.id} variant="secondary">
                {skill.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Success Criteria */}
        <div>
          <p className="text-sm font-medium mb-1">Success Criteria</p>
          <p className="text-sm text-muted-foreground">{step.successCriteria}</p>
        </div>

        {/* Suggested Mentors */}
        {step.suggestedMentors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Suggested Mentors</p>
            <div className="flex gap-2">
              {step.suggestedMentors.slice(0, 3).map((mentor) => (
                <div key={mentor.userId} className="text-xs bg-slate-100 p-2 rounded">
                  {mentor.name}
                  <p className="text-muted-foreground">{Math.round(mentor.matchScore * 100)}% match</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Bookings */}
        {step.sessionBookings.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Sessions ({step.sessionBookings.length})</p>
            <div className="space-y-2">
              {step.sessionBookings.map((sess) => (
                <div key={sess.sessionId} className="text-sm p-2 bg-green-50 rounded border border-green-200">
                  <p className="font-medium">{sess.mentorId} (TBD: fetch mentor name)</p>
                  <p className="text-xs">{formatDateTime(sess.scheduledAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {step.sessionBookings.length === 0 && step.sessionsNeeded > 0 && (
            <Button 
              size="sm"
              onClick={handleAutoBook}
              disabled={booking}
            >
              {booking ? 'Booking...' : `Book ${step.sessionsNeeded} Sessions`}
            </Button>
          )}
          {step.status === 'IN_PROGRESS' && (
            <Button 
              size="sm" 
              variant="default"
              onClick={() => {
                // Mark as complete
              }}
            >
              Mark Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### Implementation Steps

1. **New Service**: `LearningPathService.java`
   - Generate path via Ollama (`generatePath()`)
   - Track path progress
   - Auto-match mentors for each step (via `SkillMatcher`)
   - Auto-book sessions (via `ExchangeService`)

2. **New Controller**: `LearningPathController.java`
   - `POST /api/learning-paths` — create path
   - `GET /api/learning-paths` — list paths
   - `GET /api/learning-paths/{id}` — get detail
   - `GET /api/learning-paths/{id}/progress` — get progress
   - `POST /api/learning-paths/{id}/steps/{stepId}/complete` — mark step done
   - `POST /api/learning-paths/{id}/steps/{stepId}/auto-book-sessions` — auto-match + book

3. **Integration with existing services**:
   - `SkillMatcher` — find mentors for step skills
   - `ExchangeService` — create + auto-accept exchanges for path steps
   - `SessionService` — book sessions

4. **Frontend**: Multi-page UX (list → create → detail → step tracking)

### Ollama Prompt Template for Path Generation

```
You are a curriculum designer. Given a goal skill and timeline, create a structured multi-step learning path.

Goal Skill: {GOAL_SKILL}
User Level: {USER_LEVEL}
Timeline: {WEEKS} weeks
Available Skills: {SKILL_CATALOG}

Requirements:
- Break into logical, progressive steps
- Each step should take ~1-2 weeks
- List prerequisite and related skills
- Provide success criteria for each step
- Use JSON format

Output:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "...",
      "description": "...",
      "estimatedHours": <number>,
      "relatedSkills": ["skill1", "skill2"],
      "successCriteria": "...",
      "prerequisites": ["skill1"]
    }
  ]
}
```

### Type Definitions

```typescript
// frontend/src/types/learning-path.ts

export interface LearningPath {
  id: string;
  userId: string;
  goalSkill: Skill;
  learnerGoal: string;
  targetLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  timelineWeeks: number;
  steps: LearningPathStep[];
  totalEstimatedHours: number;
  estimatedCompletion: string;
  completedSteps: number;
  totalSteps: number;
  currentStep: number;
  pathStatus: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';
  createdAt: string;
  completedAt?: string;
}

export interface LearningPathStep {
  stepId: string;
  pathId: string;
  stepNumber: number;
  title: string;
  description: string;
  relatedSkills: { id: string; name: string; priority: 'FOUNDATION' | 'PRIMARY' | 'SUPPLEMENTARY' }[];
  estimatedHours: number;
  successCriteria: string;
  suggestedMentors: { userId: string; name: string; matchScore: number }[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  sessionsNeeded: number;
  sessionBookings: { sessionId: string; mentorId: string; scheduledAt: string; status: string }[];
  startedAt?: string;
  completedAt?: string;
}

export interface PathProgress {
  pathId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  overallProgress: number;
  nextMilestone: string;
  timeRemaining: string;
  isOnTrack: boolean;
}
```

### Success Criteria

- [ ] User creates path in < 10 seconds
- [ ] Path generation takes < 3 seconds
- [ ] Auto-matched mentors have > 0.85 similarity
- [ ] Sessions auto-book immediately
- [ ] Progress tracking updates in real-time
- [ ] Mobile-responsive roadmap UI

---

## 1.1: Skill Chain Auto-Orchestration

### Purpose
When a chain is accepted, auto-notify all participants, coordinate multi-party acceptance, and spin up a shared "chain room" where the whole loop tracks progress (A→B→C→A) together.

### User Experience
1. System detects a skill exchange cycle (A teaches B Python, B teaches C Spanish, C teaches A Mandarin)
2. Sends notifications to all 3: "Join this 3-way skill chain!"
3. All must accept within 24h to activate
4. Once active, all 3 join shared "Chain Room" with:
   - Shared calendar (when are we all meeting?)
   - Progress tracker (which member is on which step?)
   - Shared notes (each session is visible to all)
   - Unified transcript
5. System schedules sessions automatically, respecting timezones

### Backend API Endpoints

```
GET /api/chains?status=PENDING,ACTIVE
Response (200):
{
  "chains": [
    {
      "chainId": "uuid",
      "participants": [
        { "userId": "...", "name": "...", "isMentor": ["Python"], "isLearner": ["Spanish"] }
      ],
      "status": "PENDING_ACCEPTANCE",  // or ACTIVE, COMPLETED, CANCELLED
      "edges": [
        { "fromUserId": "...", "toUserId": "...", "skillName": "Python" }
      ],
      "createdAt": "...",
      "expiresAt": "..."
    }
  ]
}

POST /api/chains/{chainId}/accept
Response (200):
{
  "chainId": "...",
  "acceptedBy": "userId",
  "acceptanceCount": 2,  // of 3 needed
  "status": "PENDING_ACCEPTANCE",
  "acceptanceExpiresAt": "..."
}

GET /api/chains/{chainId}/room
Response (200):
{
  "chainRoomId": "uuid",
  "chainId": "...",
  "participants": [...],
  "sessions": [
    {
      "sessionId": "...",
      "fromMentor": "...",
      "toLearner": "...",
      "skill": "...",
      "scheduledAt": "...",
      "status": "SCHEDULED"
    }
  ],
  "sharedNotes": [
    { "sessionId": "...", "content": "..." }
  ],
  "transcript": { ... },
  "progress": {
    "completedSessions": 0,
    "totalSessions": 3,
    "completionPercentage": 0
  }
}

POST /api/chains/{chainId}/room/join
Response (200):
{
  "roomToken": "...",
  "agoraToken": "...",
  "roomId": "..."
}
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS exchange_chains (
  id VARCHAR(36) PRIMARY KEY,
  cycle_finder_data JSON,  -- e.g., nodes, edges, cycle info
  status ENUM('PENDING_ACCEPTANCE', 'ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING_ACCEPTANCE',
  created_by_user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS exchange_chain_participants (
  id VARCHAR(36) PRIMARY KEY,
  chain_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMP NULL,
  acceptance_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chain_id) REFERENCES exchange_chains(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_chain_user (chain_id, user_id),
  INDEX idx_accepted (accepted)
);

CREATE TABLE IF NOT EXISTS exchange_chain_edges (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  chain_id VARCHAR(36) NOT NULL,
  from_user_id VARCHAR(36) NOT NULL,
  to_user_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  exchange_id VARCHAR(36),
  session_ids JSON,  -- array of session IDs for this leg
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chain_id) REFERENCES exchange_chains(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
);

CREATE TABLE IF NOT EXISTS chain_rooms (
  id VARCHAR(36) PRIMARY KEY,
  chain_id VARCHAR(36) NOT NULL UNIQUE,
  room_code VARCHAR(20),
  shared_notes TEXT,
  transcript_id VARCHAR(36),
  status ENUM('ACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chain_id) REFERENCES exchange_chains(id) ON DELETE CASCADE,
  FOREIGN KEY (transcript_id) REFERENCES session_transcripts(id)
);
```

### Frontend Pages & Components

**Page:** `frontend/src/features/chains/pages/ChainsPage.tsx`

```tsx
// Route: /dashboard/chains
export const ChainsPage = () => {
  const [chains, setChains] = useState<ExchangeChain[]>([]);
  const [filter, setFilter] = useState<'PENDING_ACCEPTANCE' | 'ACTIVE'>('PENDING_ACCEPTANCE');

  useEffect(() => {
    ChainService.getChains({ status: filter }).then(setChains);
  }, [filter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Skill Chains</h1>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Acceptance ({chains.filter(c => c.status === 'PENDING_ACCEPTANCE').length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active Chains ({chains.filter(c => c.status === 'ACTIVE').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <ChainsList 
              chains={chains.filter(c => c.status === 'PENDING_ACCEPTANCE')}
              onAccept={(chainId) => {
                ChainService.acceptChain(chainId).then(() => {
                  // Refresh
                });
              }}
            />
          </TabsContent>

          <TabsContent value="active">
            <ChainsList 
              chains={chains.filter(c => c.status === 'ACTIVE')}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
```

**Component:** `frontend/src/features/chains/components/ChainVisualizer.tsx` (enhance existing)

```tsx
export const ChainCard = ({ chain }: { chain: ExchangeChain }) => {
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const allAccepted = chain.participants.every(p => p.accepted);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await ChainService.acceptChain(chain.chainId);
      toast.success('You accepted the chain!');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Card className="space-y-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Skill Exchange Chain</CardTitle>
            <CardDescription>{chain.participants.length}-way loop</CardDescription>
          </div>
          <Badge variant={allAccepted ? 'default' : 'secondary'}>
            {chain.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cycle Visualization */}
        <ChainVisualization chain={chain} />

        {/* Acceptance Status */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Acceptance Status</p>
          {chain.participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-2 text-sm">
              <div className={`w-4 h-4 rounded-full ${p.accepted ? 'bg-green-500' : 'bg-slate-300'}`} />
              <span>{p.name}</span>
              {p.accepted && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          ))}
        </div>

        {/* Action */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Expires in 24 hours</AlertTitle>
          <AlertDescription>All participants must accept to activate.</AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={handleAccept}
            disabled={chain.participants.some(p => p.userId === currentUserId && p.accepted) || accepting}
          >
            {accepting ? 'Accepting...' : 'Accept Chain'}
          </Button>
          {allAccepted && (
            <Button 
              variant="default"
              onClick={() => navigate(`/chains/${chain.chainId}/room`)}
            >
              Enter Chain Room →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

**Page:** `frontend/src/features/chains/pages/ChainRoomPage.tsx`

```tsx
// Route: /chains/{chainId}/room
export const ChainRoomPage = () => {
  const { chainId } = useParams<{ chainId: string }>();
  const [room, setRoom] = useState<ChainRoom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ChainService.getRoom(chainId!).then(setRoom).finally(() => setLoading(false));
  }, [chainId]);

  if (loading) return <Spinner />;
  if (!room) return <NotFound />;

  return (
    <DashboardLayout className="h-screen flex flex-col">
      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        
        {/* Left: Participant Timeline */}
        <div className="col-span-1 border-r overflow-auto">
          <ChainParticipantTimeline chain={room} />
        </div>

        {/* Center: Video/Chat (or current session) */}
        <div className="col-span-1 flex flex-col">
          <ChainSessionDisplay chain={room} />
        </div>

        {/* Right: Shared Notes & Progress */}
        <div className="col-span-1 border-l overflow-auto">
          <ChainProgressPanel chain={room} />
        </div>

      </div>
    </DashboardLayout>
  );
};
```

### Implementation Steps

1. **New Service**: `ChainOrchestrationService.java`
   - Auto-detect cycles via existing `ExchangeCycleFinder`
   - Create `exchange_chains` record
   - Send notifications to all participants
   - Track acceptance + expiry
   - Activate chain when all accept
   - Auto-schedule sessions (respecting timezones)

2. **New Service**: `ChainRoomService.java`
   - Manage `chain_rooms`
   - Coordinate multi-party sessions
   - Aggregate transcripts + notes across all sessions
   - Track progress (which leg is done)

3. **New Controller**: `ChainController.java`
   - `GET /api/chains`
   - `POST /api/chains/{id}/accept`
   - `GET /api/chains/{id}/room`
   - `POST /api/chains/{id}/room/join`

4. **Integration**:
   - `NotificationPublisher` — send to all chain participants
   - `SessionService` — auto-create + schedule sessions for each leg
   - `TranscriptService` — merge transcripts from all 3 sessions

5. **Frontend**:
   - Chain list with cycle visualization
   - Acceptance UI with countdown
   - Chain room with split-screen (video + notes + progress)

### Type Definitions

```typescript
// frontend/src/types/chain.ts

export interface ExchangeChain {
  chainId: string;
  participants: ChainParticipant[];
  edges: ChainEdge[];
  status: 'PENDING_ACCEPTANCE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  activatedAt?: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface ChainParticipant {
  userId: string;
  name: string;
  avatar?: string;
  isMentor: string[];  // skill names they teach
  isLearner: string[]; // skill names they learn
  accepted: boolean;
  acceptedAt?: string;
}

export interface ChainEdge {
  fromUserId: string;
  toUserId: string;
  skillName: string;
  skillId: string;
  exchangeId?: string;
  sessionIds?: string[];
}

export interface ChainRoom {
  chainRoomId: string;
  chainId: string;
  participants: ChainParticipant[];
  sessions: ChainRoomSession[];
  sharedNotes: SharedNote[];
  transcript: any;  // merged
  progress: {
    completedSessions: number;
    totalSessions: number;
    completionPercentage: number;
  };
}

export interface ChainRoomSession {
  sessionId: string;
  fromMentor: string;
  toLearner: string;
  skillName: string;
  skillId: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
}
```

### Success Criteria

- [ ] Chains are auto-detected and created without user action
- [ ] All participants notified within 1 minute
- [ ] Acceptance countdown shows 24h
- [ ] Sessions auto-schedule after all accept
- [ ] Chain room shows progress + shared notes
- [ ] Timezone-aware scheduling

---

## 1.3: Group Sessions

### Purpose
A mentor teaches many learners at once (workshop-style), with shared notes, attendance, and group certificates.

### User Experience
1. Mentor creates "Python Basics" group session for 20 learners
2. Learners RSVP → confirmed list with Zoom/meet link
3. At session time, all join shared video room
4. Notes are generated once (for all attendees)
5. All attendees get same certificate (with "Group Session" badge)
6. Analytics track: attendance rate, completion, learner feedback

### Backend API Endpoints

```
POST /api/sessions/group
{
  "skillId": "...",
  "title": "Python Basics Workshop",
  "description": "Learn Python fundamentals",
  "scheduledAt": "2025-06-18T15:00:00Z",
  "durationMins": 120,
  "maxParticipants": 30,
  "minParticipants": 5
}

Response (201):
{
  "groupSessionId": "uuid",
  "mentorId": "...",
  "skill": { ... },
  "title": "...",
  "status": "DRAFT",  // → SCHEDULED → IN_PROGRESS → COMPLETED
  "attendees": [],
  "maxParticipants": 30,
  "rsvpDeadlineAt": "..."
}

POST /api/sessions/{groupSessionId}/rsvp
{
  "action": "ACCEPT" | "DECLINE"
}

GET /api/sessions/{groupSessionId}/attendance
Response (200):
{
  "groupSessionId": "...",
  "attendees": [
    { "userId": "...", "name": "...", "status": "JOINED", "joinedAt": "..." }
  ],
  "confirmed": 18,
  "attended": 15,
  "attendanceRate": 83
}

GET /api/sessions/{groupSessionId}/group-note
Response (200):
{
  "sessionId": "...",
  "note": { ... same as SessionNote ... },
  "recipientCount": 15,
  "isGroupNote": true
}

POST /api/sessions/{groupSessionId}/group-certificate
Response (200):
{
  "certificateId": "...",
  "title": "Python Basics Workshop",
  "isGroupSession": true,
  "attendeeCount": 15,
  "issuedAt": "..."
}
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS group_sessions (
  id VARCHAR(36) PRIMARY KEY,
  mentor_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  duration_mins INT DEFAULT 60,
  max_participants INT DEFAULT 30,
  min_participants INT DEFAULT 5,
  actual_attendees INT DEFAULT 0,
  status ENUM('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
  rsvp_deadline_at TIMESTAMP,
  meet_link VARCHAR(500),
  room_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  INDEX idx_status (status),
  INDEX idx_scheduled (scheduled_at)
);

CREATE TABLE IF NOT EXISTS group_session_attendees (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  rsvp_status ENUM('INVITED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN') DEFAULT 'INVITED',
  rsvped_at TIMESTAMP,
  joined_at TIMESTAMP NULL,
  left_at TIMESTAMP NULL,
  attendance_status ENUM('NO_SHOW', 'PARTIAL', 'ATTENDED') DEFAULT 'NO_SHOW',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_session_user (group_session_id, user_id),
  INDEX idx_rsvp (rsvp_status)
);

CREATE TABLE IF NOT EXISTS group_session_notes (
  id VARCHAR(36) PRIMARY KEY,
  group_session_id VARCHAR(36) NOT NULL,
  note_id VARCHAR(36) NOT NULL,
  recipient_count INT,
  is_group_note BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_session_id) REFERENCES group_sessions(id),
  FOREIGN KEY (note_id) REFERENCES session_notes(id),
  UNIQUE KEY unique_session_note (group_session_id)
);

CREATE TABLE IF NOT EXISTS group_session_certificates (
  id VARCHAR(36) PRIMARY KEY,
  group_session_id VARCHAR(36) NOT NULL,
  recipient_count INT,
  is_group_certificate BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_session_id) REFERENCES group_sessions(id)
);
```

### Frontend Pages & Components

**Page:** `frontend/src/features/sessions/pages/GroupSessionsPage.tsx`

```tsx
// Route: /dashboard/group-sessions (for mentors)
export const GroupSessionsPage = () => {
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    GroupSessionService.getMySessions().then(setSessions);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Group Sessions</h1>
          <Button onClick={() => setShowCreator(true)}>
            + Create Session
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {sessions.map((session) => (
            <GroupSessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>

      {showCreator && (
        <GroupSessionCreator 
          onClose={() => setShowCreator(false)}
          onSuccess={(session) => setSessions([...sessions, session])}
        />
      )}
    </DashboardLayout>
  );
};
```

**Component:** `frontend/src/features/sessions/components/GroupSessionCard.tsx`

```tsx
export const GroupSessionCard = ({ session }: { session: GroupSession }) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition"
      onClick={() => navigate(`/group-sessions/${session.id}`)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{session.title}</CardTitle>
            <CardDescription>{session.skill.name}</CardDescription>
          </div>
          <Badge variant="outline">{session.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Date & Time</p>
            <p className="font-medium text-sm">{formatDateTime(session.scheduledAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-medium text-sm">{session.durationMins} minutes</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Attendees</p>
            <p className="font-medium text-sm">{session.actualAttendees || 0} / {session.maxParticipants}</p>
          </div>
        </div>

        {session.status === 'SCHEDULED' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>RSVP Closes {formatDate(session.rsvpDeadlineAt)}</AlertTitle>
          </Alert>
        )}

        <Button size="sm" variant="outline" onClick={(e) => {
          e.stopPropagation();
          navigate(`/group-sessions/${session.id}/manage`);
        }}>
          View Attendees
        </Button>
      </CardContent>
    </Card>
  );
};
```

**Page:** `frontend/src/features/sessions/pages/GroupSessionDetailPage.tsx`

```tsx
// Route: /group-sessions/{sessionId}
export const GroupSessionDetailPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<GroupSession | null>(null);
  const [attendees, setAttendees] = useState<GroupSessionAttendee[]>([]);
  const [note, setNote] = useState<SessionNote | null>(null);

  useEffect(() => {
    Promise.all([
      GroupSessionService.getSession(sessionId!),
      GroupSessionService.getAttendees(sessionId!),
      GroupSessionService.getGroupNote(sessionId!),
    ]).then(([s, a, n]) => {
      setSession(s);
      setAttendees(a);
      setNote(n);
    });
  }, [sessionId]);

  if (!session) return <Spinner />;

  return (
    <DashboardLayout>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendees">Attendees ({attendees.length})</TabsTrigger>
          <TabsTrigger value="notes">Shared Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Session details, video link, etc. */}
        </TabsContent>

        <TabsContent value="attendees">
          <GroupSessionAttendeesList attendees={attendees} />
        </TabsContent>

        <TabsContent value="notes">
          {note && <SessionNotesPanel note={note} />}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};
```

### Implementation Steps

1. **Extend `Session` model** to support group mode:
   - Add `boolean isGroupSession`
   - Add `Integer maxParticipants`
   - Add `String roomCode`

2. **New Service**: `GroupSessionService.java`
   - Create group sessions
   - Manage RSVP (invite, accept, decline)
   - Track attendance (joined, left)
   - Generate group certificates

3. **New Controller**: `GroupSessionController.java`
   - `POST /api/sessions/group` — create
   - `GET /api/sessions/{id}/attendance` — attendance report
   - `POST /api/sessions/{id}/rsvp` — RSVP endpoint
   - `POST /api/sessions/{id}/group-certificate` — issue group cert

4. **Extend existing services**:
   - `SessionRoomController` — detect group vs. 1:1, handle multi-party Agora RTC
   - `NoteGenerationService` — generate notes once, distribute to all attendees
   - `CertificateService` — issue group certificates with attendee list

5. **Frontend**:
   - Mentor group session creator
   - Learner RSVP UI
   - Group session detail with attendee list
   - Shared notes + certificates

### Type Definitions

```typescript
// frontend/src/types/group-session.ts

export interface GroupSession extends Session {
  isGroupSession: true;
  title: string;
  description?: string;
  maxParticipants: number;
  actualAttendees: number;
  rsvpDeadlineAt: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface GroupSessionAttendee {
  userId: string;
  name: string;
  avatar?: string;
  rsvpStatus: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  rsvpedAt?: string;
  attendanceStatus: 'NO_SHOW' | 'PARTIAL' | 'ATTENDED';
  joinedAt?: string;
  leftAt?: string;
}
```

### Success Criteria

- [ ] Mentors can create group sessions with invites
- [ ] Learners can RSVP + receive confirmation
- [ ] Multi-party Agora room works with 20+ participants
- [ ] Notes generated once but visible to all attendees
- [ ] Group certificates issued to all attendees
- [ ] Attendance tracking (who joined, when, duration)

---

# Infrastructure & Supporting Features

## Database Migrations

Create file: `backend/src/main/resources/db/migration/V39__tier0_tier1_complete.sql`

```sql
-- Tier 0 Flashcards, Quiz, Action Items
CREATE TABLE IF NOT EXISTS session_flashcards (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  question TEXT NOT NULL,
  answer LONGTEXT NOT NULL,
  difficulty ENUM('EASY', 'INTERMEDIATE', 'HARD') DEFAULT 'INTERMEDIATE',
  ease_factor FLOAT DEFAULT 2.5,
  reviews_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMP NULL,
  next_review_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  INDEX idx_session (session_id),
  INDEX idx_next_review (next_review_at)
);

-- ... (rest of schema from sections above)
```

---

# Type Definitions & Contracts

## Shared API Response Envelope

```typescript
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  timestamp: string;
  path: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
```

## Common DTOs

```typescript
// Skill
export interface Skill {
  id: string;
  name: string;
  description: string;
  category?: string;
  proficiencyLevels: ProficiencyLevel[];
}

// User
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  skills: UserSkill[];
  rating: number;
  sessionsCompleted: number;
}

// Session (base)
export interface Session {
  id: string;
  exchangeId: string;
  teacher: User;
  learner: User;
  skill: Skill;
  scheduledAt: string;
  durationMins: number;
  status: 'PROPOSED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sessionType: 'VIDEO' | 'AUDIO';
  meetLink?: string;
  sharedNotes?: string;
  createdAt: string;
}
```

---

# Implementation Notes & Anti-Patterns

## What to Do

1. **Cache aggressively**: Ollama calls are expensive. Cache Skill-Gap analyses, flashcards, and descriptions.
2. **Parallelize where possible**: Unit A (Tier 0) features can all be worked in parallel—they share infrastructure.
3. **Use Ollama's JSON mode**: Most prompts should output structured JSON, not prose.
4. **Batch notifications**: Don't send real-time notifications for every chain accept—queue and batch-send.
5. **Test with real embeddings**: Don't mock embeddings in tests—use actual data.
6. **Version prompts**: Store Ollama prompts in a versioned service; make it easy to A/B test variations.
7. **Validate intensively**: User input to Ollama can be harmful; sanitize all keywords, descriptions, etc.

## What NOT to Do

1. **Don't block on Ollama**: All Ollama calls should be async. Return quickly to user, generate in background.
2. **Don't hardcode prompts**: Centralize in a service.
3. **Don't trust single-model outputs**: For grading, assessment, moderation—use multiple Ollama calls and aggregate.
4. **Don't skip error handling**: Ollama can timeout, hallucinate, or return invalid JSON. Always have fallbacks.
5. **Don't merge all sessions into one**: Keep 1:1, group, and chain rooms separate in code—they have different concerns.
6. **Don't forget rate limits**: Ollama on a single machine will thrash under load. Implement queue + rate limiting.

## Success Metrics

- **Tier 0 completion**: All 5 features live and tested with users within 1.5 days.
- **Tier 1 completion**: All 4 flagship features live within 2.5 days.
- **Infrastructure completion**: Security, monitoring, PWA within 3.5 days.
- **Ollama latency**: < 2 seconds for gap analysis, flashcards, quiz grading.
- **Embedding latency**: < 100ms for semantic search.
- **Session creation**: < 5 seconds from user action to booking.
- **User satisfaction**: 4.5+ star rating on generated content (flashcards, descriptions, paths).

---

## Appendix A: Ollama Prompt Registry

### Centralized Prompt Management

**Service:** `OllamaPromptTemplateService.java`

```java
@Service
public class OllamaPromptTemplateService {

    private final Map<String, PromptTemplate> templates = new ConcurrentHashMap<>();

    public OllamaPromptTemplateService() {
        // Register all templates with version control
        registerTemplate("SKILL_GAP_ANALYSIS", new PromptTemplate(
            "You are an expert curriculum designer...",
            "1.0",
            false  // not cached
        ));
        
        registerTemplate("FLASHCARD_GENERATION", new PromptTemplate(
            "Given the following session transcript...",
            "1.0",
            true   // cacheable
        ));
        
        // ... more templates
    }

    public String renderPrompt(String templateName, Map<String, String> variables) {
        PromptTemplate template = templates.get(templateName);
        if (template == null) throw new IllegalArgumentException("Template not found: " + templateName);
        
        String prompt = template.text;
        for (var entry : variables.entrySet()) {
            prompt = prompt.replace("{" + entry.getKey() + "}", entry.getValue());
        }
        return prompt;
    }

    public PromptTemplate getTemplate(String name) {
        return templates.get(name);
    }
}

record PromptTemplate(String text, String version, boolean cacheable) {}
```

---

## Appendix B: Testing Strategy

### Unit Tests (Tier 0)

1. **SkillGapAnalyzerService**:
   - Test with mock embeddings
   - Test with empty current skills
   - Test with target = current skill

2. **FlashcardService**:
   - Test Anki SM-2 algorithm
   - Test card difficulty assignment

3. **TutorBotService**:
   - Test message context retention
   - Test quiz generation

4. **SemanticSearchService**:
   - Test multi-type result aggregation
   - Test ranking by similarity

5. **DescriptionGeneratorService**:
   - Test output validation
   - Test keyword extraction

### Integration Tests (Tier 1)

1. **LearningPathService**:
   - Create path → generate steps → match mentors → book sessions
   - Verify all steps created

2. **ChainOrchestrationService**:
   - Create chain → notify participants → accept → activate → auto-schedule
   - Verify notifications, exchanges, sessions

3. **GroupSessionService**:
   - Create session → invite attendees → RSVP → attend → generate notes
   - Verify attendance tracking, certificate issuance

### End-to-End Tests

1. **User journey**: Register → browse skills → request gap analysis → select path → complete step → earn certificate
2. **Chain journey**: Two users find each other → accept chain → complete both sessions → earn certs
3. **Group journey**: Mentor creates workshop → learners RSVP → attend → receive shared notes + cert

---

## Appendix C: Deployment Checklist

- [ ] All Ollama prompts versioned in `OllamaPromptTemplateService`
- [ ] Redis or in-memory cache configured for expensive calls
- [ ] Rate limiting configured on `/api/ai/*` endpoints
- [ ] Input validation on all user-generated text fields
- [ ] Email templates created for notifications
- [ ] WebSocket message handlers tested with 20+ concurrent users
- [ ] Database migrations tested (forward + rollback)
- [ ] Frontend offline service worker configured
- [ ] Monitoring dashboards created (Ollama latency, cache hit rate, error rate)
- [ ] Admin moderation panel functional
- [ ] Analytics events fired on all key actions

---

**Document Version:** 1.0  
**Last Updated:** 2025-06-11  
**Next Review:** After Tier 0 completion
