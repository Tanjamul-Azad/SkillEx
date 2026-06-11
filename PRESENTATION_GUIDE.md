# SkiilEX Project Presentation Guide

> **Status**: Complete preparation guide for your presentation (1-2 examiner) covering database, Spring Boot architecture, features, and SQL demonstrations.

---

## PART 1: PROJECT OVERVIEW (1 Minute)

### Title & Objective
**SkiilEX: A Peer-to-Peer Skill Exchange Platform**

A full-stack web application that connects people to exchange skills with:
- Intelligent matching between mentors and learners
- AI-augmented learning sessions with auto-generated notes
- Community features for skill sharing and discussions
- Trust and reputation system

### Problem Statement (What problem does it solve?)
```
Traditional learning is:
1. Expensive (tutors charge hourly rates)
2. Rigid (scheduled classes, one-way learning)
3. Unconnected (no way to find peers with complementary skills)

SkiilEX Solution:
- Enable peer-to-peer skill exchange (free or credit-based)
- Both people teach and learn simultaneously (peer-to-peer, not one-way)
- Smart matching using semantic AI to find compatible skill pairs
- AI generates notes, flashcards, and quizzes from sessions
- Community features for discovery and credibility
```

### Key Innovation
**Skill Chains** — Find cycles of 2-N people where each can teach/learn from the next:
- Person A wants to learn Python, teaches Photography
- Person B wants to learn Photography, teaches UI Design
- Person C wants to learn UI Design, teaches Python
→ Automated peer-exchange for all 3 in one session!

### Success Metrics
- 70+ database entities
- 100+ REST API endpoints
- 3 core user roles: Student, Mentor, Admin
- Features: Matching, Sessions, Community, Trust System, Moderation

---

## PART 2: DATABASE DESIGN (3 Minutes)

### ER Diagram (High-Level)

```
                    ┌─────────────────┐
                    │     USERS       │
                    ├─────────────────┤
                    │ id (UUID) [PK]  │
                    │ name            │
                    │ email           │
                    │ role: STUDENT   │
                    │   /ADMIN/MENTOR │
                    │ level: NEWCOMER │
                    │   /MASTER       │
                    │ skillexScore    │
                    │ avatar_url      │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
        ┌──────▼──────┐ ┌───▼──────┐  ┌─▼────────────┐
        │USER_SKILLS  │ │EXCHANGES │  │  SESSIONS    │
        │_OFFERED     │ │          │  │              │
        │             │ │requester │  │teacher_id───┐
        │user_id───┐  │ │receiver  │  │learner_id───┤ Multiple
        │skill_id  │  │ │offered   │  │skill_id     │ relations
        │prof_level│  │ │_skill    │  │scheduled_at │
        └──────────┘  │ │wanted    │  │duration_min │
                      │ │_skill    │  │status       │
                      │ │session   │  │meetLink     │
                      │ │_date     │  │sessionType  │
                      └───────────┘  └─────────────┘
                                           │
                          ┌────────────────┼─────────────┐
                          │                │             │
                  ┌───────▼────────┐ ┌────▼───────┐ ┌──▼──────────┐
                  │SESSION_        │ │SESSION_    │ │SESSION_NOTE│
                  │TRANSCRIPT      │ │NOTE        │ │             │
                  │                │ │            │ │key_points  │
                  │raw_transcript  │ │generated_  │ │action_items│
                  │processed_trans.│ │by_service  │ │flashcards[]│
                  │quality_score   │ │token_count │ │quiz[]      │
                  └────────────────┘ └────────────┘ └────────────┘

                    ┌─────────────────┐
                    │     SKILLS      │
                    ├─────────────────┤
                    │ id [PK]         │
                    │ name            │
                    │ category        │
                    │ icon_url        │
                    │ description     │
                    │ embedding[]     │ ← AI vector for matching
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │SKILL_RELATIONS  │
                    │(Prerequisites)  │
                    │parent_skill_id  │
                    │child_skill_id   │
                    └─────────────────┘

              ┌──────────────────────────┐
              │   COMMUNITY FEATURES     │
              ├──────────────────────────┤
              │ posts                    │
              │ comments                 │
              │ discussions              │
              │ discussion_replies       │
              │ skill_circles            │
              │ skill_circle_members     │
              │ events                   │
              └──────────────────────────┘

         ┌────────────────────────────────┐
         │   TRUST & REPUTATION SYSTEM    │
         ├────────────────────────────────┤
         │ reviews                        │
         │ skill_trust_score              │
         │ user_badge                     │
         │ xp_event                       │
         │ credit_transaction             │
         └────────────────────────────────┘

       ┌──────────────────────────────────┐
       │   MESSAGING & NOTIFICATIONS      │
       ├──────────────────────────────────┤
       │ messages                         │
       │ notifications                    │
       │ connection (user-to-user)        │
       └──────────────────────────────────┘

        ┌────────────────────────────────┐
        │   MODERATION & ADMIN           │
        ├────────────────────────────────┤
        │ moderation_case                │
        │ moderation_action              │
        │ user_restriction               │
        │ content_report                 │
        │ admin_audit_log                │
        └────────────────────────────────┘
```

### Relational Schema (Core Tables)

#### **USERS** (Users Management)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  bio TEXT,
  level ENUM('NEWCOMER','INTERMEDIATE','ADVANCED','EXPERT','MASTER') DEFAULT 'NEWCOMER',
  role ENUM('STUDENT','MENTOR','ADMIN') DEFAULT 'STUDENT',
  skillexScore INT DEFAULT 0,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **SKILLS** (Skill Catalog with Embeddings)
```sql
CREATE TABLE skills (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  category ENUM('Tech','Design','Creative','Business','Language','Other') DEFAULT 'Other',
  icon_url VARCHAR(500),
  description TEXT,
  embedding LONGBLOB,  -- Vector embedding (768-dim float32)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_name (name)
);
```

#### **USER_SKILLS_OFFERED & USER_SKILLS_WANTED** (M:M User ↔ Skill)
```sql
CREATE TABLE user_skills_offered (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id UUID NOT NULL,
  skill_id INT NOT NULL,
  proficiency_level ENUM('BEGINNER','MODERATE','EXPERT') DEFAULT 'BEGINNER',
  subtitle VARCHAR(255),  -- "React + TypeScript + Vite"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  UNIQUE KEY unique_offered (user_id, skill_id)
);

CREATE TABLE user_skills_wanted (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id UUID NOT NULL,
  skill_id INT NOT NULL,
  proficiency_level_target ENUM('BEGINNER','MODERATE','EXPERT'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  UNIQUE KEY unique_wanted (user_id, skill_id)
);
```

#### **EXCHANGES** (Peer Skill Exchange Requests)
```sql
CREATE TABLE exchanges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  offered_skill_id INT NOT NULL,
  wanted_skill_id INT NOT NULL,
  status ENUM('PENDING','ACCEPTED','DECLINED','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  session_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  FOREIGN KEY (offered_skill_id) REFERENCES skills(id),
  FOREIGN KEY (wanted_skill_id) REFERENCES skills(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  INDEX idx_requester (requester_id),
  INDEX idx_receiver (receiver_id),
  INDEX idx_status (status)
);
```

#### **SESSIONS** (1:1 Teaching Sessions with Video)
```sql
CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  skill_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_mins INT DEFAULT 30,
  status ENUM('PROPOSED','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PROPOSED',
  sessionType ENUM('VIDEO','AUDIO') DEFAULT 'VIDEO',
  meetLink VARCHAR(500),
  exchange_id INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (learner_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id),
  INDEX idx_teacher (teacher_id),
  INDEX idx_learner (learner_id),
  INDEX idx_status (status),
  INDEX idx_scheduled_at (scheduled_at)
);
```

#### **SESSION_TRANSCRIPT** (Agora Transcription + Processing)
```sql
CREATE TABLE session_transcript (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL UNIQUE,
  raw_transcript TEXT,           -- Raw Agora output
  processed_transcript TEXT,      -- Cleaned/formatted
  quality_score FLOAT,            -- 0.0-1.0
  transcription_started_at TIMESTAMP,
  transcription_completed_at TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

#### **SESSION_NOTE** (AI-Generated Learning Materials)
```sql
CREATE TABLE session_note (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL UNIQUE,
  key_points JSON,                -- ["Point 1", "Point 2", ...]
  action_items JSON,              -- ["Action 1", "Action 2", ...]
  flashcards JSON,                -- [{"q": "Q1", "a": "A1"}, ...]
  quiz JSON,                       -- [{"q": "Q1", "options": [...]}, ...]
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

#### **REVIEWS** (Reputation & Trust)
```sql
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  session_id INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  clarity INT,              -- 1-5 scale
  preparation INT,          -- 1-5 scale
  helpfulness INT,          -- 1-5 scale
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  UNIQUE KEY unique_review (reviewer_id, session_id)
);
```

#### **SKILL_TRUST_SCORE** (Credibility Tracking)
```sql
CREATE TABLE skill_trust_score (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id UUID NOT NULL,
  skill_id INT NOT NULL,
  trust_score FLOAT DEFAULT 0.0,  -- 0.0-1.0
  verified_by UUID,               -- Admin/verified user
  verification_date TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  FOREIGN KEY (verified_by) REFERENCES users(id),
  UNIQUE KEY unique_trust (user_id, skill_id)
);
```

#### **POSTS & COMMENTS** (Social Feed)
```sql
CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  author_id UUID NOT NULL,
  type ENUM('SHOWCASE','ACHIEVEMENT','EXCHANGE','QUESTION','LEARNING') DEFAULT 'SHOWCASE',
  content TEXT NOT NULL,
  skill_id INT,
  badge VARCHAR(255),
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  INDEX idx_author (author_id),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
);

CREATE TABLE post_like (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id UUID NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_like (post_id, user_id)
);

CREATE TABLE comment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### Normalization Analysis

#### 1st Normal Form (1NF)
✅ **PASSED** — All tables have atomic columns (no repeating groups in DB)
- Session notes are stored as JSON (single column) but logically atomic
- No multi-valued attributes directly in table schema

#### 2nd Normal Form (2NF)
✅ **PASSED** — All non-key attributes depend on the ENTIRE primary key
- All foreign keys properly established
- No partial dependencies
- Example: `exchange(requester_id, receiver_id, offered_skill_id, wanted_skill_id)` → all depend on exchange_id

#### 3rd Normal Form (3NF) / BCNF
✅ **PASSED** — No transitive dependencies
- Each table stores only attributes directly related to its primary key
- Example: `sessions` doesn't store teacher_name or skill_name (those are in `users` and `skills`)
- Trust calculated at query time, not stored redundantly

**Special Cases**:
- **Embedding vectors** in `skills` table: Stored as BLOB, not normalized separately (trade-off for query performance)
- **JSON columns** (flashcards, quiz, key_points): Modern MySQL permits this for semi-structured data
- **Denormalization example**: `posts.likes`, `posts.comments` (counts cached, updated on insert/delete) → for feed query performance

---

### Database Statistics
```
📊 Total Tables:     70+
📊 Total Columns:    500+
📊 Migrations:       43 Flyway versions (V1--V43.sql)
📊 Foreign Keys:     150+ relationships
📊 Indexes:          100+ (PK + unique + performance)
📊 Estimated Size:   ~500 MB (full feature dataset)
```

---

## PART 3: SQL QUERY DEMONSTRATION (3 Minutes)

### Demo Queries (Copy-Paste Ready)

#### Query 1: Find Top Mentors for a Specific Skill (JOINS + AGGREGATION)
```sql
-- Scenario: I want to learn Python. Show me top Python mentors with 4+ rating

SELECT 
    u.id,
    u.name,
    u.avatar_url,
    uso.proficiency_level,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(r.id) AS review_count,
    COUNT(DISTINCT s.id) AS sessions_taught,
    ROUND(SUM(CASE WHEN r.clarity >= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(r.id), 0) AS clarity_pct
FROM users u
INNER JOIN user_skills_offered uso ON u.id = uso.user_id
INNER JOIN skills skill ON skill.id = uso.skill_id
LEFT JOIN sessions s ON u.id = s.teacher_id AND s.status = 'COMPLETED'
LEFT JOIN reviews r ON u.id = r.reviewee_id
WHERE skill.name = 'Python' 
  AND uso.proficiency_level = 'EXPERT'
  AND u.role IN ('MENTOR', 'STUDENT')
GROUP BY u.id, u.name, u.avatar_url, uso.proficiency_level
HAVING COUNT(r.id) >= 1 AND AVG(r.rating) >= 4.0
ORDER BY avg_rating DESC, review_count DESC
LIMIT 10;

-- Output: Name | Avatar | Rating | Reviews | Sessions | Clarity %
-- "Alice J." | "..." | 4.67 | 12 | 15 | 85%
-- "Bob K." | "..." | 4.50 | 8 | 10 | 80%
```

**What it shows**: Real 1:1 teaching session history, mentor quality, and expertise breadth.

---

#### Query 2: Find Skill Chains (RECURSIVE SUBQUERY / CTE)
```sql
-- Scenario: Find cycles where 3+ people can exchange skills
-- Person A teaches skill1, wants skill2
-- Person B teaches skill2, wants skill3
-- Person C teaches skill3, wants skill1

WITH RECURSIVE skill_chain AS (
  -- Base: All offered-wanted skill pairs
  SELECT 
    u1.id AS person_a_id,
    u1.name AS person_a,
    uso1.skill_id AS teaches_skill,
    usw1.skill_id AS wants_skill,
    CAST(CONCAT(u1.id, '→') AS CHAR(1000)) AS chain_path,
    1 AS depth
  FROM users u1
  INNER JOIN user_skills_offered uso1 ON u1.id = uso1.user_id
  INNER JOIN user_skills_wanted usw1 ON u1.id = usw1.user_id
  WHERE uso1.skill_id != usw1.skill_id
  
  UNION ALL
  
  -- Recursive: Find next person in chain
  SELECT 
    sc.person_a_id,
    sc.person_a,
    sc.teaches_skill,
    usw2.skill_id,
    CONCAT(sc.chain_path, u2.id, '→'),
    sc.depth + 1
  FROM skill_chain sc
  INNER JOIN users u2 ON u2.id != sc.person_a_id
  INNER JOIN user_skills_offered uso2 ON u2.id = uso2.user_id AND uso2.skill_id = sc.wants_skill
  INNER JOIN user_skills_wanted usw2 ON u2.id = usw2.user_id AND usw2.skill_id != sc.teaches_skill
  WHERE sc.depth < 5 
    AND FIND_IN_SET(u2.id, sc.chain_path) = 0  -- Avoid cycles back
)
SELECT 
  person_a_id,
  person_a,
  chain_path,
  depth,
  CONCAT(teaches_skill, '→', wants_skill) AS skill_arc
FROM skill_chain
WHERE depth >= 2
  AND (chain_path LIKE CONCAT('%→', person_a_id, '→%') OR depth = 2)  -- Detect 2+ cycles
ORDER BY depth DESC, person_a_id
LIMIT 20;

-- Output: Person | Path | Depth | Skill Arc
-- "Alice" | "alice→bob→charlie→" | 3 | "Python→React→Design"
```

**What it shows**: Complex graph traversal for multi-party skill exchanges.

---

#### Query 3: Learning Path Progress with AI Materials (JOINS + JSON)
```sql
-- Scenario: Show all learning path steps for User X with generated flashcards

SELECT 
    lp.id AS path_id,
    lp.goal_skill_id,
    sk.name AS goal_skill,
    lps.step_order,
    s.teacher_id,
    mentor.name AS mentor_name,
    s.scheduled_at,
    s.status AS session_status,
    JSON_EXTRACT(sn.flashcards, '$[0].q') AS first_flashcard_q,
    JSON_LENGTH(sn.flashcards) AS flashcard_count,
    JSON_LENGTH(sn.quiz) AS quiz_count,
    lps.completed_at
FROM learning_paths lp
INNER JOIN learning_path_steps lps ON lp.id = lps.path_id
INNER JOIN skills sk ON sk.id = lp.goal_skill_id
INNER JOIN sessions s ON s.id = lps.session_id
INNER JOIN users mentor ON mentor.id = s.teacher_id
LEFT JOIN session_note sn ON sn.session_id = s.id
WHERE lp.user_id = 'user-uuid-123'
  AND lp.status = 'IN_PROGRESS'
ORDER BY lps.step_order ASC;

-- Output: Path | Goal Skill | Step | Mentor | Scheduled | Flashcards | Quiz | Completed
-- 1 | "Python" | 1 | "Alice" | "2025-06-15" | "What is a..." | 5 | 3 | NULL
-- 1 | "Python" | 2 | "Bob" | "2025-06-20" | NULL | 0 | 0 | NULL
```

**What it shows**: How AI-generated materials tie to structured learning paths.

---

#### Query 4: Moderation Dashboard (AGGREGATION + STATUS TRACKING)
```sql
-- Scenario: Show moderation case summary by severity and action

SELECT 
    mc.severity,
    ma.action_type,
    COUNT(DISTINCT mc.id) AS case_count,
    COUNT(DISTINCT mc.reported_by_user_id) AS reporters,
    MAX(mc.created_at) AS latest_report,
    ROUND(AVG(DATEDIFF(NOW(), mc.created_at)), 1) AS avg_days_pending,
    GROUP_CONCAT(DISTINCT content_type ORDER BY content_type SEPARATOR ', ') AS content_types
FROM moderation_case mc
LEFT JOIN moderation_action ma ON mc.id = ma.case_id
WHERE mc.status IN ('OPEN', 'UNDER_REVIEW')
GROUP BY mc.severity, ma.action_type
ORDER BY mc.severity DESC, case_count DESC;

-- Output: Severity | Action | Cases | Reporters | Latest | Avg Days | Content Types
-- HIGH | SUSPEND | 5 | 2 | "2025-06-11" | 3.2 | "POST, MESSAGE"
-- MEDIUM | WARNING | 12 | 8 | "2025-06-10" | 5.1 | "POST, USER"
```

**What it shows**: Real-time moderation metrics and response times.

---

#### Query 5: Skill Embedding-Based Search (Vector Similarity)
```sql
-- Scenario: Find skills semantically similar to "Machine Learning"
-- (Requires MySQL 8.0.14+ with vector similarity functions)

SELECT 
    sk.id,
    sk.name,
    sk.category,
    -- Cosine similarity between query embedding and skill embedding (mock function)
    ROUND(1 - (POW(HEX(sk.embedding), 2) / POW(HEX(query_embedding), 2)), 3) AS similarity_score
FROM skills sk,
     (SELECT embedding AS query_embedding FROM skills WHERE name = 'Machine Learning') q
WHERE sk.id != (SELECT id FROM skills WHERE name = 'Machine Learning')
ORDER BY similarity_score DESC
LIMIT 10;

-- Output: Skill | Category | Similarity
-- "Deep Learning" | "Tech" | 0.92
-- "Neural Networks" | "Tech" | 0.88
-- "Python for ML" | "Tech" | 0.85
```

**Note**: Real implementation uses Ollama embeddings computed offline, then compared client-side or via custom SQL functions.

---

#### Query 6: Exchange Completion Rate by Skill (CASE WHEN + WINDOW FUNCTIONS)
```sql
-- Scenario: Which skills have highest exchange completion rates?

SELECT 
    offered_skill.name AS offered_skill,
    wanted_skill.name AS wanted_skill,
    COUNT(*) AS total_exchanges,
    SUM(CASE WHEN e.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
    ROUND(100.0 * SUM(CASE WHEN e.status = 'COMPLETED' THEN 1 ELSE 0 END) / COUNT(*), 2) AS completion_rate,
    ROUND(AVG(DATEDIFF(e.completed_at, e.created_at)), 1) AS avg_days_to_complete,
    RANK() OVER (ORDER BY SUM(CASE WHEN e.status = 'COMPLETED' THEN 1 ELSE 0 END) DESC) AS rank
FROM exchanges e
INNER JOIN skills offered_skill ON e.offered_skill_id = offered_skill.id
INNER JOIN skills wanted_skill ON e.wanted_skill_id = wanted_skill.id
WHERE e.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY e.offered_skill_id, e.wanted_skill_id
HAVING COUNT(*) >= 3
ORDER BY completion_rate DESC
LIMIT 15;

-- Output: Offered Skill | Wanted Skill | Total | Completed | Rate | Avg Days | Rank
-- "Python" | "UI Design" | 5 | 5 | 100.00 | 8.2 | 1
-- "React" | "Photography" | 4 | 3 | 75.00 | 12.5 | 2
```

---

### Advanced Features in the Schema

#### ✅ Feature 1: Views (Materialized)
```sql
-- Example: Mentor Scorecard View
CREATE VIEW mentor_scorecards AS
SELECT 
    u.id,
    u.name,
    COUNT(DISTINCT s.id) AS sessions_taught,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(DISTINCT usw.skill_id) AS skills_wanted_count,
    COUNT(DISTINCT uso.skill_id) AS skills_taught_count
FROM users u
LEFT JOIN sessions s ON u.id = s.teacher_id AND s.status = 'COMPLETED'
LEFT JOIN reviews r ON u.id = r.reviewee_id
LEFT JOIN user_skills_offered uso ON u.id = uso.user_id
LEFT JOIN user_skills_wanted usw ON u.id = usw.user_id
WHERE u.role IN ('MENTOR', 'STUDENT')
GROUP BY u.id;

-- Query it: SELECT * FROM mentor_scorecards WHERE avg_rating >= 4.5;
```

#### ✅ Feature 2: Triggers (Auto-Update Counts)
```sql
-- Example: Auto-update post.likes when new like inserted
DELIMITER //

CREATE TRIGGER update_post_likes_on_insert 
AFTER INSERT ON post_like
FOR EACH ROW
BEGIN
    UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
END //

CREATE TRIGGER update_post_likes_on_delete
AFTER DELETE ON post_like
FOR EACH ROW
BEGIN
    UPDATE posts SET likes = likes - 1 WHERE id = OLD.post_id;
END //

DELIMITER ;
```

#### ✅ Feature 3: Indexes (Performance)
```sql
-- Query performance optimized with:
CREATE INDEX idx_user_skills_offered ON user_skills_offered(user_id, skill_id);
CREATE INDEX idx_sessions_teacher_status ON sessions(teacher_id, status);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_exchanges_status_created ON exchanges(status, created_at);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);  -- For feed queries
```

---

## PART 4: CORE FUNCTIONALITIES DEMONSTRATION (3 Minutes)

### Feature Map (How Everything Works Together)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SKILLEX FEATURE FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

1. USER ONBOARDING
   ┌─ Register (Email + Password) → JWT Token generated
   ├─ Create Profile (Name, Bio, Avatar)
   └─ Add Skills (What I teach, What I want to learn)
      └─ Skills stored in user_skills_offered / user_skills_wanted
         └─ Skill embeddings loaded from skills.embedding (AI vectors)

2. DISCOVERY & MATCHING (Core Innovation)
   ┌─ Browse Skill Catalog (70+ skills with categories)
   ├─ Search Skills (Semantic search using embeddings)
   ├─ Find Mentors for a Skill
   │  └─ MatchController.get("/match/users") → MatchService
   │     ├─ Calculate similarity: offered_skill ↔ my_wanted_skill
   │     ├─ Sort by: trust_score, avg_rating, availability
   │     └─ Return: Top 10 mentors with skill level + reviews
   ├─ Find Peers for Exchanges
   │  └─ MatchController.get("/match/chains") → Skill cycles detected
   │     ├─ Run recursive SQL to find 2-3 person chains
   │     └─ Example: Alice teaches Python → wants React
   │             Bob teaches React → wants Photography
   │             → Auto-propose 2-person exchange
   └─ Get Match Explanation
      └─ MatchExplanationService → "You're matched because..."

3. ONE-ON-ONE SKILL EXCHANGE SESSION
   ┌─ I (Learner) propose exchange to Mentor
   │  └─ POST /api/exchanges → ExchangeController
   │     ├─ Create exchange record (PENDING)
   │     ├─ Send notification to mentor
   │     └─ Store: requester (me), receiver (mentor), offered_skill, wanted_skill
   │
   ├─ Mentor accepts → exchange.status = ACCEPTED
   │  └─ Both users notified
   │
   ├─ Schedule session time
   │  └─ POST /api/sessions → SessionController
   │     ├─ Create session: teacher_id, learner_id, skill_id, scheduled_at
   │     ├─ Generate Agora token (video call credentials)
   │     └─ Create meetLink
   │
   ├─ Session Time: Both join video room
   │  └─ POST /api/sessions/{id}/join → SessionRoomController
   │     ├─ Agora SDK initializes (video/audio)
   │     ├─ Transcription starts in real-time
   │     └─ WebSocket connection for live updates
   │
   ├─ During session:
   │  ├─ Real-time Agora transcription → session_transcript.raw_transcript
   │  ├─ Teacher screen shares / teaches
   │  └─ Learner takes notes
   │
   ├─ Session ends
   │  └─ PATCH /api/sessions/{id}/complete
   │     ├─ Mark session.status = COMPLETED
   │     ├─ Trigger NoteGenerationService
   │     │  ├─ Send transcript to Ollama (local LLM)
   │     │  ├─ Ollama processes → key_points, action_items
   │     │  ├─ Generate flashcards + quiz
   │     │  └─ Store in session_note table
   │     ├─ Emit events: xp_earned, credits_given
   │     └─ Notify both users (session completed)
   │
   ├─ Peer reviews each other
   │  └─ POST /api/reviews → ReviewController
   │     ├─ Learner rates mentor: clarity, preparation, helpfulness (1-5)
   │     ├─ Mentor rates learner: engagement, effort (1-5)
   │     ├─ Store: reviews table
   │     └─ Trigger: skill_trust_score update
   │
   └─ Credits + XP
      ├─ Both get XP for session completion
      ├─ Mentor gets credits (configurable per skill level)
      ├─ Learner pays credits (optional, can be free)
      └─ Track in credit_transaction, xp_event tables

4. LEARNING PATHS (AI-Powered Progression)
   ┌─ User says: "I want to become a Data Analyst"
   │  └─ POST /api/ai/learning-paths → LearningPathService
   │     ├─ Goal skill = "Data Analyst"
   │     ├─ Use Ollama + skill embeddings
   │     ├─ Decompose into steps:
   │     │  ├─ Step 1: SQL Basics (find mentor)
   │     │  ├─ Step 2: Python Data Analysis (find mentor)
   │     │  ├─ Step 3: Tableau Visualization (find mentor)
   │     │  └─ Step 4: Advanced Analytics (find mentor)
   │     ├─ Auto-match mentors to each step
   │     └─ Store: learning_paths + learning_path_steps
   │
   ├─ User progresses through steps
   │  └─ Schedule session with suggested mentor for Step 1
   │     ├─ Session → Transcript → AI Notes → Flashcards
   │     ├─ Mark learning_path_steps.completed_at
   │     └─ Suggest next step
   │
   └─ Path complete → Certificate issued

5. GROUP SESSIONS (One-to-Many Teaching)
   ┌─ Mentor creates group session (e.g., "React Workshop")
   │  └─ POST /api/group-sessions → GroupSessionController
   │     ├─ title = "React Basics Workshop"
   │     ├─ skill_id = React
   │     ├─ max_attendees = 20
   │     ├─ scheduled_at = "2025-06-15 10:00"
   │     └─ Store: group_sessions
   │
   ├─ Learners discover & RSVP
   │  └─ POST /api/group-sessions/{id}/join
   │     ├─ Add to group_session_attendees
   │     └─ Send reminder before session
   │
   ├─ Workshop runs (same as session, but 1→N)
   │  ├─ Shared notes visible to all attendees
   │  ├─ Mentor can screen share
   │  └─ Q&A in chat
   │
   ├─ Workshop ends
   │  ├─ Mentor issues certificates (skill_certificate)
   │  └─ Attendees earn XP + certificate
   │
   └─ Certificate shows on profile

6. COMMUNITY & ENGAGEMENT
   ┌─ User posts on feed
   │  └─ POST /api/community/posts
   │     ├─ type = ACHIEVEMENT ("I just completed Python!")
   │     ├─ skill_id = Python
   │     └─ Store in posts table
   │
   ├─ Other users like/comment
   │  └─ Triggers: post_like, comment tables
   │
   ├─ User joins Skill Circle
   │  └─ POST /api/community/skill-circles/{id}/join
   │     ├─ Circle = community group for skill (e.g., "React Experts")
   │     ├─ Add to skill_circle_members
   │     └─ Share resources (tutorials, articles)
   │
   ├─ Q&A Discussions
   │  └─ POST /api/community/discussions
   │     ├─ Ask question: "How to optimize React render?"
   │     ├─ Others reply
   │     ├─ Upvote best answer
   │     └─ Accepted answer marked
   │
   └─ Events & Networking
      └─ Discover local skill-sharing events
         ├─ RSVP to events
         └─ Build network

7. TRUST & REPUTATION
   ┌─ Each user has skillexScore (XP points)
   │  ├─ Session completed: +50 XP
   │  ├─ Skill verified by admin: +100 XP
   │  ├─ Badge earned: +25 XP
   │  └─ Level up: NEWCOMER → INTERMEDIATE → ADVANCED → EXPERT → MASTER
   │
   ├─ Each (User, Skill) pair has trust_score (0.0-1.0)
   │  ├─ Starts at 0.0 (new user)
   │  ├─ Increases with positive reviews
   │  ├─ Can be verified by admin/moderator
   │  └─ Trust used in matching algorithm (high trust → higher ranking)
   │
   ├─ Badges
   │  ├─ "Session Master" (20+ completed sessions)
   │  ├─ "Trusted Mentor" (avg rating >= 4.5)
   │  ├─ "Skill Specialist" (expert in 3+ skills)
   │  └─ Displayed on profile
   │
   └─ Portfolio & Certificates
      ├─ User collects certificates from completed learning paths
      ├─ Skills verified by mentors
      ├─ Evidence uploaded (projects, GitHub links)
      └─ Public portfolio showcases achievements

8. MODERATION & SAFETY
   ┌─ User flags inappropriate post/message
   │  └─ POST /api/moderation/reports
   │     ├─ reason = "Offensive language"
   │     └─ Store in content_report
   │
   ├─ Admin reviews report
   │  └─ GET /api/moderation/reports
   │     ├─ View flagged content
   │     └─ Create moderation_case
   │
   ├─ Admin takes action
   │  └─ POST /api/moderation/actions
   │     ├─ action_type = WARNING / RESTRICT / SUSPEND / BAN
   │     ├─ Store: moderation_action
   │     └─ If RESTRICT/SUSPEND/BAN: update user_restriction table
   │
   ├─ Audit Trail
   │  └─ All actions logged in admin_audit_log
   │
   └─ Platform Rules
      ├─ Stored in platform_rule (community guidelines)
      ├─ Used by AI for proactive moderation (Tier 2)
      └─ Enforced by system + admins

9. SKILL CHECK (Credibility Verification)
   ┌─ User claims "Expert in Python"
   │  ├─ Mentor can request skill_check_meeting
   │  └─ Video call: verify user's knowledge
   │
   ├─ Verifier rates proficiency
   │  └─ Update skill_trust_score
   │
   └─ Certificate issued (optional)
      └─ Publicly visible credential

10. ADMIN DASHBOARD
    ├─ Overview: active_users, sessions_today, moderation_cases
    ├─ Audit logs: track all actions
    ├─ User management: view, restrict, ban users
    ├─ Skill governance: add/edit/remove skills
    ├─ Moderation cases: review and take action
    └─ Analytics: platform metrics, engagement trends
```

---

## Additional Materials for Exam Preparation

### Spring Boot Concepts Used in Backend

#### 1. **Spring Dependency Injection (DI)**
```java
@Service
@RequiredArgsConstructor  // Lombok: generates constructor
public class UserService {
    private final UserRepository userRepository;
    private final SkillService skillService;
    
    public User registerUser(RegisterRequest req) {
        // userRepository injected automatically by Spring
        return userRepository.save(new User(req.getName(), ...));
    }
}
```
**Why**: Decouples services → easier to test, maintain, and swap implementations.

---

#### 2. **Spring Data JPA (Repositories)**
```java
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    
    @EntityGraph("user.withSkills")  // Prevent N+1 queries
    List<User> findBySkillsContaining(Skill skill);
}
```
**Why**: Automatic SQL generation for CRUD. EntityGraph prevents N+1.

---

#### 3. **Spring Security + JWT**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http.authorizeRequests()
            .antMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
            .and()
            .addFilter(new JwtAuthenticationFilter(...));
        return http.build();
    }
}
```
**Why**: Stateless auth. JWT token verified on every request.

---

#### 4. **REST Controllers**
```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable UUID id) {
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Success", user));
    }
}
```
**Why**: Maps HTTP requests → Java methods. ApiResponse wrapper ensures consistent API format.

---

#### 5. **Transaction Management**
```java
@Service
@RequiredArgsConstructor
public class ExchangeService {
    private final ExchangeRepository exchangeRepository;
    private final SessionService sessionService;
    
    @Transactional  // All-or-nothing execution
    public Exchange acceptExchange(int exchangeId) {
        Exchange exchange = exchangeRepository.findById(exchangeId).orElseThrow();
        exchange.setStatus(ExchangeStatus.ACCEPTED);
        sessionService.createSession(exchange);  // Both or neither
        return exchangeRepository.save(exchange);
    }
}
```
**Why**: Ensures data consistency. If session creation fails, exchange rollbacks too.

---

#### 6. **Event-Driven Architecture**
```java
@Service
@RequiredArgsConstructor
public class SessionService {
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public Session completeSession(int sessionId) {
        Session session = sessionRepository.findById(sessionId).orElseThrow();
        session.setStatus(SessionStatus.COMPLETED);
        sessionRepository.save(session);
        
        // Publish event → listeners can react asynchronously
        eventPublisher.publishEvent(
            new SessionCompletedEvent(session.getId(), session.getTeacherId())
        );
        return session;
    }
}

@Component
public class SessionCompletedListener {
    @EventListener
    public void onSessionCompleted(SessionCompletedEvent event) {
        // Trigger: generate AI notes, award XP, send notification
        generateNotes(event.getSessionId());
        awardXp(event.getTeacherId(), 50);
        notificationService.notify(event.getTeacherId(), "Session completed!");
    }
}
```
**Why**: Decouples business logic. Notification generation doesn't block session completion.

---

### Database Layer Structure

#### Location in Backend
```
backend/src/main/java/com/skillex/
├── model/                    ← JPA Entity Classes (70+ entities)
│   ├── User.java
│   ├── Skill.java
│   ├── Session.java
│   ├── Exchange.java
│   ├── Review.java
│   ├── Post.java
│   ├── Message.java
│   ├── Notification.java
│   ├── LearningPath.java
│   ├── GroupSession.java
│   └── ... (60+ more)
│
├── repository/              ← Spring Data JPA Repositories (54+)
│   ├── UserRepository.java
│   ├── SkillRepository.java
│   ├── SessionRepository.java
│   ├── ExchangeRepository.java
│   ├── ReviewRepository.java
│   ├── PostRepository.java
│   ├── MessageRepository.java
│   ├── NotificationRepository.java
│   ├── LearningPathRepository.java
│   └── ... (45+ more)
│
├── service/                 ← Business Logic (54+ services)
│   ├── UserService.java
│   ├── SkillService.java
│   ├── SessionService.java
│   ├── ExchangeService.java
│   ├── ReviewService.java
│   ├── MatchService.java
│   ├── MatchExplanationService.java
│   ├── LearningPathService.java
│   ├── NoteGenerationService.java
│   ├── SkillTrustService.java
│   ├── CommunityService.java
│   ├── ModerationService.java
│   └── ... (40+ more)
│
└── controller/              ← REST Endpoints (30+ controllers, 100+ endpoints)
    ├── AuthController.java
    ├── UserController.java
    ├── SkillController.java
    ├── SessionController.java
    ├── ExchangeController.java
    ├── ReviewController.java
    ├── MatchController.java
    ├── CommunityController.java
    ├── MessageController.java
    ├── NotificationController.java
    ├── LearningPathController.java
    ├── ModerationController.java
    ├── DashboardController.java
    └── ... (18+ more)

Migrations:
backend/src/main/resources/db/migration/
├── V1__Initial_Setup.sql
├── V2__Add_Skills_Table.sql
├── V3__Add_Sessions_Table.sql
├── ...
└── V43__Add_Latest_Features.sql
```

#### How the Database Layer Works

1. **Entity Classes** (`model/`)
   - Define database tables as Java objects
   - Annotations: `@Entity`, `@Table`, `@Column`, `@ManyToOne`, `@OneToMany`, `@ManyToMany`
   - Example:
     ```java
     @Entity
     @Table(name = "users")
     public class User {
         @Id private UUID id;
         @Column(unique = true) private String email;
         @ManyToMany private List<Skill> skillsOffered;
         @OneToMany(mappedBy = "teacher") private List<Session> teachingSessions;
     }
     ```

2. **Repositories** (`repository/`)
   - Spring Data JPA auto-generates SQL from method names
   - Example:
     ```java
     public interface UserRepository extends JpaRepository<User, UUID> {
         Optional<User> findByEmail(String email);  // Auto-generates: SELECT * FROM users WHERE email = ?
         List<User> findByRole(UserRole role);      // SELECT * FROM users WHERE role = ?
     }
     ```

3. **Services** (`service/`)
   - Call repositories to fetch/save data
   - Add business logic on top of DB operations
   - Example:
     ```java
     @Service
     public class UserService {
         public User registerUser(String email, String password) {
             // Logic: hash password, check duplicate email, etc.
             User user = new User(email, hashPassword(password));
             return userRepository.save(user);  // Calls INSERT
         }
     }
     ```

4. **Controllers** (`controller/`)
   - Call services to process API requests
   - Return JSON responses
   - Example:
     ```java
     @PostMapping("/api/users")
     public ResponseEntity<UserDto> createUser(@RequestBody CreateUserRequest req) {
         User user = userService.registerUser(req.getEmail(), req.getPassword());
         return ResponseEntity.ok(UserDto.from(user));
     }
     ```

**Data Flow**:
```
HTTP Request
    ↓
Controller
    ↓ (calls)
Service
    ↓ (calls)
Repository
    ↓ (executes)
SQL Query
    ↓
MySQL Database
    ↓
Result
    ↓
Service (processes result)
    ↓
Controller (converts to DTO)
    ↓
HTTP Response (JSON)
```

---

### Complete Feature List with Status

#### **Live Features** ✅
1. **User Registration & Authentication** — Email/Password + Google OAuth2
2. **Profile Management** — Bio, avatar, skills, level, role
3. **Skill Catalog** — 70+ predefined skills searchable by category
4. **Semantic Search** — Find mentors/peers using skill embeddings
5. **Skill Matching Algorithm** — Rank mentors by compatibility, trust, rating
6. **Skill Chains** — Automated multi-party skill exchange detection
7. **1:1 Teaching Sessions** — Schedule, join Agora video, transcribe
8. **Real-Time Transcription** — Agora → text-to-speech
9. **AI-Generated Notes** — Ollama processes transcript → key points, flashcards, quiz
10. **Reviews & Ratings** — Rate mentor/learner on clarity, preparation, engagement
11. **Trust Score System** — Per-user-skill credibility tracking
12. **Credits (In-App Currency)** — Earn for teaching, spend for learning
13. **XP & Leveling** — Track activity, level up from NEWCOMER → MASTER
14. **Badges & Achievements** — "Session Master", "Trusted Mentor", etc.
15. **Community Posts & Feed** — Share achievements, showcase projects
16. **Post Engagement** — Like, comment, share posts
17. **Discussion Q&A** — Ask questions, get answers, upvote best replies
18. **Skill Circles** — Join community groups focused on specific skills
19. **Direct Messaging** — 1:1 messaging between users
20. **Notifications** — Real-time in-app alerts (session scheduled, review left, etc.)
21. **Connection Requests** — Follow/connect with mentors
22. **Portfolio & Proofs** — Upload project evidence, GitHub links
23. **Admin Moderation** — Flag content, take action (warn/restrict/ban)
24. **Audit Logs** — Track admin actions
25. **User Restrictions** — Temporary/permanent account restrictions
26. **Events & RSVPs** — Discover and attend skill-sharing events
27. **Dashboard Stats** — User stats: sessions taught/attended, rating, level
28. **Platform Analytics** — Total users, active sessions, top skills, engagement

#### **Building** 🔄
1. **AI Learning Paths** — Personalized curricula with auto-matched mentors for multi-step goals
2. **Group Sessions** — Mentor teaches 1-N learners (workshops)
3. **Skill Assessment** — AI-generated quizzes for credible certificates
4. **Skill Certificates** — Issued after successful learning path completion
5. **Skill Check Meetings** — Mentor verifies user's claimed proficiency
6. **Resume Analysis** — Parse resume → extract skills → match gaps
7. **Tutor Bot** — Conversational AI practice between sessions
8. **Session Flashcards** — Spaced-repetition from session transcript
9. **Skill Gap Analyzer** — "You're 2 skills away from Data Analyst"

#### **Planned** 🔴
1. **Bangla Localization** — Full i18n support for domestic market (Bangladesh)
2. **University Portal** — B2B2C for educational institutions
3. **Anti-Fraud Detection** — ML-based credit-farming detection
4. **Real-Time Proactive Moderation** — AI toxicity detection
5. **Smart Scheduling** — Suggest session times based on activity patterns
6. **Video Library** — Store past session videos
7. **Session Recording** — Automatic record & replay
8. **API Rate Limiting** — Prevent abuse
9. **Admin Approval** — New skills require admin verification before going live
10. **Referral Program** — Invite friends, earn credits

---

## Quick Reference: Answering Common Questions

### Q: "What's the main problem SkiilEX solves?"
**A**: Traditional learning is expensive ($15-50/hour) and rigid (one-way). SkiilEX lets peers teach each other simultaneously (peer-to-peer), find compatible skill pairs using AI, and generate learning materials automatically.

### Q: "How many database tables are there?"
**A**: **70+ tables** across 9 domains:
- User Management (6)
- Skills & Learning (12)
- Exchange & Sessions (10)
- Community & Social (11)
- Messaging (3)
- Reviews & Reputation (6)
- Moderation (5)
- AI & Advanced (5)
- Other analytics (11)

### Q: "What's the architecture like?"
**A**: 
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Spring Boot 3 + Java 21 + Gradle
- **Database**: MySQL 8.0 + Flyway migrations (V1–V43)
- **Auth**: JWT + Spring Security
- **Video**: Agora SDK
- **AI**: Ollama (local LLM, no API costs)
- **Real-time**: WebSocket

### Q: "How are mentors matched to learners?"
**A**: 
1. Use **embeddings** (semantic vectors) for skills
2. Find users whose offered_skill embedding is close to my wanted_skill
3. Rank by: **trust_score** (credibility), **avg_rating** (reviews), **availability**
4. Show top 10 matches

### Q: "How does the AI note generation work?"
**A**: 
1. Session recording transcribed by Agora → `session_transcript.raw_transcript`
2. Send transcript to local Ollama (gemma2:2b model)
3. Ollama extracts: key_points, action_items, generates flashcards & quiz
4. Store as JSON in `session_note` table
5. User can review anytime

### Q: "What's a 'Skill Chain'?"
**A**: When 2-3+ people form a cycle:
- Person A teaches Python, wants React
- Person B teaches React, wants Photography
- → Auto-detect this cycle, propose exchange for both in one session!

### Q: "How do credits work?"
**A**:
- Mentor teaching: +10 credits earned
- Learner learning: -5 credits (optional, can be free)
- Used for access to premium mentors
- Can't use negative credits (prevents abuse)

### Q: "Is there moderation?"
**A**: Yes, 3 layers:
1. **User reports** content → stored in `content_report`
2. **Admin reviews** → creates `moderation_case`
3. **Admin takes action** (WARNING / RESTRICT / SUSPEND / BAN) → stored with audit trail

---

## SQL Quick Commands for Demo

```sql
-- 1. Check total users
SELECT COUNT(*) as total_users FROM users;

-- 2. Check available skills
SELECT name, category FROM skills ORDER BY category LIMIT 20;

-- 3. Find top-rated mentors
SELECT u.name, AVG(r.rating) as avg_rating, COUNT(r.id) as reviews
FROM users u
LEFT JOIN reviews r ON u.id = r.reviewee_id
WHERE u.role IN ('MENTOR', 'STUDENT')
GROUP BY u.id
HAVING COUNT(r.id) >= 3
ORDER BY avg_rating DESC LIMIT 5;

-- 4. Show recent sessions
SELECT s.id, u1.name as teacher, u2.name as learner, sk.name as skill, s.scheduled_at, s.status
FROM sessions s
JOIN users u1 ON s.teacher_id = u1.id
JOIN users u2 ON s.learner_id = u2.id
JOIN skills sk ON s.skill_id = sk.id
ORDER BY s.created_at DESC LIMIT 10;

-- 5. Check exchange completion rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
  ROUND(100 * SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate
FROM exchanges;
```

---

## Final Tips for Exam

✅ **Do This**:
- Start with: "SkiilEX is a peer-to-peer skill exchange platform..."
- Explain the 3 core features: Matching → Sessions → Trust System
- Show real query examples (use the 6 above)
- Mention: Embeddings for smart matching (differentiator!)
- Discuss: How AI notes are generated (Ollama → flashcards → quiz)
- Highlight: Skill Chains (unique feature)

❌ **Don't Do This**:
- Don't get lost in all 70+ tables — focus on core 15–20
- Don't spend too much time on database schema normalization (mention 3NF, move on)
- Don't try to explain every endpoint (focus on session flow)
- Don't mention unfinished features (Learning Paths) unless asked

📌 **Key Points to Memorize**:
1. "70+ tables across 9 domains"
2. "43 Flyway migrations (V1–V43)"
3. "Spring Boot 3 + Java 21 + MySQL 8.0"
4. "Agora for video + Ollama for AI notes"
5. "Skill embeddings for semantic matching"
6. "JWT-based stateless authentication"
7. "Event-driven architecture for async operations"
