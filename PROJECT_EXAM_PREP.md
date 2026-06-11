# SkiilEX: Complete Exam Preparation Index

> **Master Guide** — Everything you need for your presentation. Start here!

---

## 📋 QUICK NAVIGATION

### For Your 10-Minute Presentation:
1. **Read**: [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md#part-1-project-overview-1-minute) — **Project Overview (1 min)**
2. **Read**: [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md#part-2-database-design-3-minutes) — **Database Design (3 min)** + ER Diagram
3. **Read**: [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md#part-3-sql-query-demonstration-3-minutes) — **SQL Queries (3 min)** + Copy-paste ready code
4. **Read**: [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md#part-4-core-functionalities-demonstration-3-minutes) — **Features Demo (3 min)**

### For Spring Boot Questions:
- **Read**: [SPRING_BOOT_AND_FEATURES_GUIDE.md](SPRING_BOOT_AND_FEATURES_GUIDE.md#part-a-spring-boot-concepts) — Complete Spring Boot explanation

### For "Where is database code?" Questions:
- **Read**: [DATABASE_LAYER_GUIDE.md](DATABASE_LAYER_GUIDE.md) — Directory structure + how it works

---

## ⏱️ 10-MINUTE PRESENTATION STRUCTURE

```
Total: 10 minutes (flexible)
├─ Introduction (30 sec)
│  └─ "I built SkiilEX, a peer-to-peer skill exchange platform"
│
├─ Project Overview (1 min)
│  ├─ Problem: Learning is expensive, rigid, unconnected
│  ├─ Solution: Peer-to-peer skill exchange with AI
│  └─ Innovation: Skill chains (2-3 person auto-exchange)
│
├─ Database Design (3 min)
│  ├─ ER Diagram (show relationships)
│  ├─ 70+ tables across 9 domains
│  ├─ Normalization: 1NF → 2NF → 3NF ✅
│  └─ Advanced features: Views, triggers, indexes
│
├─ SQL Queries (3 min)
│  ├─ Query 1: Find top mentors (JOINS + AGGREGATION)
│  ├─ Query 2: Skill chains (RECURSIVE CTE)
│  ├─ Query 3: Learning paths with AI materials
│  └─ Query 4+: Show 2-3 more examples
│
├─ Core Features (2.5 min)
│  ├─ Matching algorithm (embeddings + trust score)
│  ├─ 1:1 sessions (video + transcription + AI notes)
│  ├─ Community (posts, discussions, circles)
│  ├─ Moderation (reports, cases, actions)
│  └─ Economy (credits, XP, badges)
│
└─ Questions (30 sec - 1 min)
   └─ Be ready for: Spring Boot, database, features, architecture
```

---

## 🎯 WHAT THEY'LL LIKELY ASK

### 1. **About Your Project**
```
Q: "What's your project about?"
A: "SkiilEX is a peer-to-peer skill exchange platform. 
   Traditional learning is expensive ($15-50/hr) and one-way.
   SkiilEX lets peers teach each other simultaneously.
   Person A teaches Python, learns React.
   Person B teaches React, learns Photography.
   → Automated matching using AI embeddings."

Q: "What's unique about it?"
A: "Three differentiators:
   1. Skill chains (auto-detect 2-3 person exchange cycles)
   2. AI-generated notes from session transcripts (Ollama)
   3. Trust system (credibility scored per skill)"
```

### 2. **Database Questions**
```
Q: "How many tables?"
A: "70+ tables across 9 domains:
   - User management (6)
   - Skills & learning (12)
   - Sessions & exchanges (10)
   - Community (11)
   - Trust & reputation (6)
   - Others (25+)"

Q: "Why so many tables?"
A: "Separation of concerns + scalability.
   Each domain has its own entity set.
   Easy to add features without affecting others.
   Proper normalization (1NF, 2NF, 3NF)."

Q: "Explain your ER diagram"
A: [Draw on board/show slide]
   User ↔ Skill (M:M via user_skills_offered/wanted)
   Exchange → Session (1:many)
   Session → Transcript → Note (chain)
   User ↔ Review (M:M)
   Posts → Comments, Likes (1:many)
```

### 3. **SQL Query Questions**
```
Q: "Show me an important query"
A: "Here's finding top mentors for Python:

SELECT u.name, AVG(r.rating), COUNT(s.id)
FROM users u
JOIN user_skills_offered uso ON u.id = uso.user_id
LEFT JOIN sessions s ON u.id = s.teacher_id
LEFT JOIN reviews r ON u.id = r.reviewee_id
WHERE uso.skill_id = (SELECT id FROM skills WHERE name = 'Python')
GROUP BY u.id
HAVING COUNT(r.id) >= 3 AND AVG(r.rating) >= 4.0
ORDER BY AVG(r.rating) DESC
LIMIT 10;

This shows: JOINS, AGGREGATION, GROUP BY, HAVING, subqueries"

Q: "How about complex queries?"
A: "Skill chains use recursive CTEs to find cycles:
   
   WITH RECURSIVE skill_chain AS (
       -- Find starting person
       -- Recursively find next in chain
       -- Stop when cycle detected
   )
   → Returns: Alice→Bob→Alice (3-way exchange)"
```

### 4. **Architecture Questions**
```
Q: "What's the tech stack?"
A: "Frontend: React 19 + TypeScript + Vite
   Backend: Spring Boot 3 + Java 21 + Gradle
   Database: MySQL 8.0 + Flyway (43 migrations)
   Auth: JWT + Spring Security
   Video: Agora SDK
   AI: Ollama (local, no API costs)
   Real-time: WebSocket for transcription"

Q: "How does authentication work?"
A: "User logs in → Backend generates JWT token
   Token contains: userId, role, expiration
   Stored in frontend sessionStorage
   Each request includes: Authorization: Bearer <token>
   Backend verifies token signature (no DB query needed)"

Q: "How are sessions end-to-end?"
A: [Explain the complete flow from PRESENTATION_GUIDE.md]
   Request exchange → Accept → Schedule → Join video →
   Transcribe → Generate notes → Rate → Earn XP/credits"
```

### 5. **Spring Boot Questions**
```
Q: "Explain Dependency Injection"
A: "Spring automatically injects dependencies.
   Don't create objects manually.
   Benefits: Loose coupling, testability, cleaner code.
   Example: @RequiredArgsConstructor generates constructor"

Q: "How do repositories work?"
A: "Spring Data JPA auto-generates SQL from method names.
   findByEmail(email) → SELECT * FROM users WHERE email = ?
   No manual SQL, less boilerplate, type-safe"

Q: "Why use @Transactional?"
A: "All-or-nothing execution. If any step fails, entire
   transaction rollbacks. Example: Accept exchange →
   Create session → Reserve credits. If credit fails,
   entire transaction undoes."
```

### 6. **Features Questions**
```
Q: "How does matching work?"
A: "Calculate score for each mentor:
   - Trust score (skill credibility): 0.0-1.0
   - Rating (average review): 1-5
   - Compatibility (skill overlap): 0.0-1.0
   Final score = 0.4*trust + 0.2*rating + 0.4*compat
   Rank mentors, return top 10"

Q: "How are AI notes generated?"
A: "1. Session transcribed by Agora
   2. Sent to local Ollama (gemma2:2b)
   3. Ollama extracts: key points, flashcards, quiz
   4. Stored as JSON in session_note table
   Takes 5-10 seconds, runs async"

Q: "How does moderation work?"
A: "3 layers:
   1. Users report content
   2. Admin reviews reports
   3. Admin takes action: WARNING/RESTRICT/SUSPEND/BAN
   All logged in audit_audit_log with compliance trail"
```

---

## 🔧 IF THEY ASK ABOUT CODE

### Show Them:
1. **Repository Pattern** (simple, impressive)
   ```java
   // Only needs method name!
   Optional<User> findByEmail(String email);  // Spring generates SQL
   ```

2. **Service Layer**
   ```java
   @Service
   public class MatchService {
       public List<MatchDto> findBestMentors(UUID userId, int skillId) {
           // Business logic here
       }
   }
   ```

3. **Controller** (REST endpoint)
   ```java
   @GetMapping("/match/users")
   public ResponseEntity<ApiResponse<List<MatchDto>>> getMatches() {
       List<MatchDto> matches = matchService.findBestMentors(...);
       return ResponseEntity.ok(new ApiResponse<>(true, "Success", matches));
   }
   ```

### Don't Need to Show:
- Complex JPA annotations (too much detail)
- WebSocket code (unless they ask about real-time)
- All 70 entity classes (just explain a few)

---

## 📊 KEY STATISTICS TO MEMORIZE

```
PROJECT SCALE:
├─ 70+ database tables
├─ 100+ REST API endpoints
├─ 54+ service classes
├─ 30+ controllers
└─ 43 Flyway migrations

FEATURES:
├─ 28 live features (fully working)
├─ 9 building features (in progress)
├─ 10 planned features (future)
└─ Total: 47 features

ARCHITECTURE:
├─ Frontend: React 19 + TypeScript
├─ Backend: Spring Boot 3 + Java 21
├─ Database: MySQL 8.0
├─ Integrations: Agora, Ollama, Firebase
└─ Auth: JWT-based stateless

TIME TO BUILD:
├─ Database design: ~1 week
├─ Backend APIs: ~2-3 weeks
├─ Frontend UI: ~2-3 weeks
├─ Integrations (Video, AI): ~1-2 weeks
├─ Testing & refinement: ~1 week
└─ Total: ~8-10 weeks
```

---

## 💡 TIPS FOR SUCCESS

✅ **DO**:
- Start with clear problem statement (learning is expensive)
- Show the ER diagram (draws a picture)
- Copy-paste SQL queries (impresses with complexity)
- Explain one feature end-to-end (matching → session → notes → review)
- Talk about scaling (70 tables isn't overkill, it's planned growth)
- Mention innovations (embeddings, Ollama, skill chains)

❌ **DON'T**:
- Get lost in all 70+ tables (focus on core 15-20)
- Over-explain normalization (mention 1NF/2NF/3NF, move on)
- Code-dump your entire codebase (select key examples)
- Claim you're an expert in everything (it's OK to say "I focused on backend")
- Make up features you don't have (stick to what's built)
- Apologize for unfinished features (say "building in progress")

---

## 📚 DOCUMENT QUICK REFERENCE

| Document | When to Use | Key Sections |
|----------|------------|--------------|
| [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md) | For your 10-min talk | Overview, DB design, SQL, features |
| [SPRING_BOOT_AND_FEATURES_GUIDE.md](SPRING_BOOT_AND_FEATURES_GUIDE.md) | Backend questions | DI, JPA, Security, Services |
| [DATABASE_LAYER_GUIDE.md](DATABASE_LAYER_GUIDE.md) | "Where's the code?" | Entity/Repository/Service structure |
| [This file](PROJECT_EXAM_PREP.md) | Quick reference | Stats, tips, navigation |

---

## 🎬 PRESENTATION SCRIPT (2-3 minutes)

```
"Good [morning/afternoon].
I'm presenting SkiilEX, a peer-to-peer skill exchange platform.

PROBLEM:
Traditional learning is expensive ($15-50/hour) and one-way.
Students pay tutors, don't teach back.
Hard to find compatible skill pairs.

SOLUTION:
SkiilEX matches peers who can teach each other.
Person A teaches Python, learns React.
Person B teaches React, learns Photography.
→ Both learn simultaneously, no money needed (or optional credits).

INNOVATION:
We use AI embeddings to find semantic matches.
We have 'skill chains' - automated detection of 3-person exchanges.
AI generates learning materials from session transcripts.

SCALE:
70+ database tables, 100+ API endpoints, 28 live features.
Architecture: React frontend, Spring Boot backend, MySQL database.
Uses Agora for video, Ollama for AI (no API costs).

DATABASE:
9 domains: users, skills, sessions, exchanges, reviews, community,
messaging, moderation, analytics.
All normalized to 3NF.

KEY FEATURES:
1. Smart matching (embeddings + trust scores)
2. Video sessions with real-time transcription
3. AI-generated study materials (flashcards, quizzes)
4. Community engagement (posts, discussions, circles)
5. Moderation & safety system

TECH STACK:
Frontend: React 19, TypeScript
Backend: Spring Boot 3, Java 21
Database: MySQL 8.0, Flyway migrations
Auth: JWT + Spring Security

That's a quick overview. Happy to answer questions!"
```

---

## 🚀 BEFORE YOU PRESENT

- [ ] Read all 4 documents (estimate: 2-3 hours)
- [ ] Memorize the 6-7 statistics
- [ ] Practice saying the 2-3 minute script
- [ ] Prepare 2-3 SQL queries on a notepad
- [ ] Draw the ER diagram on paper (hand it to examiners)
- [ ] Have [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md) open on your laptop
- [ ] Write down 5-10 possible questions and your answers
- [ ] Get good sleep the night before 😴

---

## 📞 COMMON FOLLOW-UP QUESTIONS & ANSWERS

### "How does the matching algorithm scale?"
```
Current: O(n*m) where n = learners, m = mentors
Optimized: Use skill embeddings (cosine similarity, fast)
           Precompute trust scores (cached)
           Index by skill_id (database indexes)
Result: Sub-second response even with 100k users
```

### "What if two people have the same skill level?"
```
Tiebreaker order:
1. Trust score (credibility)
2. Average rating (quality)
3. Availability (least booked)
4. Date joined (new users get chance)
```

### "How do you prevent abuse (credit farming)?"
```
Mechanisms:
1. No self-exchange (can't match with yourself)
2. Minimum session duration (can't complete in 1 min)
3. Trust score requirement (new users need verification)
4. Moderators flag suspicious patterns
5. Future: ML model for fraud detection
```

### "What about data privacy?"
```
Implementation:
1. Passwords hashed (bcrypt, not reversible)
2. JWT tokens (no session data stored server-side)
3. PII fields (email, name) encrypted at rest
4. GDPR compliance: users can request data export/delete
5. Audit logs: track who accessed what, when
```

### "How do you handle session conflicts?"
```
Implementation:
1. Check availability before scheduling
2. Session timestamps + 5-min buffer between sessions
3. User can only join active sessions (status = IN_PROGRESS)
4. Prevent double-booking with database constraints
5. Queue system for overbooked time slots
```

---

## ✨ FINAL TIPS

1. **Be Confident**: You built a 70-table database! That's impressive.

2. **Show Complexity**: Don't oversimplify. Mention:
   - Recursive CTEs for skill chains
   - Event-driven architecture
   - Async note generation
   - Embedding-based matching

3. **Know Your Limits**: It's OK to say:
   - "That's a great question, I focused on backend but..."
   - "We're still working on that feature"
   - "That would require..."

4. **Ask Questions Back**: If something unclear:
   - "Do you want me to explain that deeper?"
   - "Should I focus on the database or features?"

5. **Bring Proof**: Have GitHub links ready
   - Show code examples
   - Share migration files
   - Demo database schema

---

**Good luck on your exam! You've got this! 🎓**

Remember: They're impressed that you:
- Built a full-stack project
- Designed a complex database
- Implemented intelligent matching
- Integrated AI services
- Thought about scaling & security

Focus on that, and you'll do great! 👊
