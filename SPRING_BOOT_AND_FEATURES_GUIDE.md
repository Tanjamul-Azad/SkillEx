# SkiilEX: Spring Boot & Features Explained (Bengali/English)

> **Bengali/English Mix Guide** — Quick answers for common interview questions about Spring Boot architecture and how all features work together.

---

## PART A: SPRING BOOT CONCEPTS (আপনার পরিচয়ের জন্য)

### 1. **Spring Framework কি?**
**Bangla**: Spring একটি Java framework যা enterprise applications তৈরির জন্য tools প্রদান করে। এটি:
- Dependency Injection (DI) করে
- Database operations সহজ করে
- Security handle করে
- REST API তৈরি করতে সাহায্য করে

**How SkiilEX uses it**: 
```
SkiilEX backend একটি Spring Boot application (Spring Framework এর lightweight version)
→ UserService, SkillService, SessionService সব Spring-managed beans
→ Database access Spring Data JPA through repositories
→ REST endpoints Spring @RestController through
```

---

### 2. **Dependency Injection (ডিপেন্ডেন্সি ইনজেকশন) কি?**

**সহজ ব্যাখ্যা**:
```
একটি ক্লাসকে অন্য ক্লাসের instance দরকার হলে, 
নিজে create না করে Spring সেটা দিয়ে দেয়।

❌ Without DI:
public class UserService {
    private UserRepository repo = new UserRepository();  // Hard-code
}

✅ With DI:
@Service
public class UserService {
    @Autowired  // Spring injects automatically
    private UserRepository repo;
}

Benefit: Testing সহজ, loose coupling, reusability
```

**SkiilEX Example**:
```java
@Service
@RequiredArgsConstructor  // Lombok: auto-generate constructor with final fields
public class SessionService {
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final NoteGenerationService noteGenerationService;
    
    // Spring inject করে এই তিনটা dependency
    public Session completeSession(int sessionId) {
        Session session = sessionRepository.findById(sessionId).orElseThrow();
        // sessionRepository automatically injected
        
        noteGenerationService.generateNotes(session);
        // noteGenerationService automatically injected
    }
}
```

---

### 3. **Spring Data JPA কি?**

**সহজ ব্যাখ্যা**:
```
Database queries লেখার পরিবর্তে Java methods define করো, 
Spring automatically SQL generate করবে।

❌ Without JPA:
public class UserRepository {
    public User findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";
        // Write raw SQL, handle results manually
    }
}

✅ With JPA:
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);  // Spring auto-generates SQL!
}

Usage:
User user = userRepository.findByEmail("alice@example.com").orElseThrow();
// Behind scenes: SELECT * FROM users WHERE email = 'alice@example.com'
```

**SkiilEX has 54 repositories**:
```
UserRepository, SkillRepository, SessionRepository, ExchangeRepository, 
ReviewRepository, PostRepository, MessageRepository, NotificationRepository, 
LearningPathRepository, GroupSessionRepository, ... and 44 more

Each repo automatically generates 50+ CRUD queries!
```

---

### 4. **Spring Security + JWT কি?**

**সহজ ব্যাখ্যা**:
```
Traditional way (Sessions):
User logs in → Server creates session → Stores in memory
               → Browser gets session_id cookie
               → Every request carries cookie
               → Server checks session validity

Problems: Scalability issue (state on server), harder to scale across servers

JWT way (Stateless):
User logs in → Server creates JWT token (compact JSON)
            → Browser stores token (localStorage/sessionStorage)
            → Every request carries token in Authorization header
            → Server verifies token signature (doesn't need DB query!)

Token structure:
Header.Payload.Signature
-----
{
  "header": {"alg": "HS256", "typ": "JWT"},
  "payload": {"userId": "uuid-123", "role": "STUDENT", "exp": 1625097600},
  "signature": "cryptographic_signature"
}
```

**SkiilEX Implementation**:
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeRequests()
                .antMatchers("/api/auth/**").permitAll()  // Login/register public
                .anyRequest().authenticated()              // All others need JWT
            .and()
            .addFilter(new JwtAuthenticationFilter(...));  // Check JWT on every request
        return http.build();
    }
}

Flow:
Frontend: POST /api/auth/login with email + password
    ↓
Backend receives, verifies password
    ↓
Generate JWT token with userId + role inside
    ↓
Return token to frontend: {token: "eyJhbGc..."}
    ↓
Frontend stores in sessionStorage
    ↓
Every request includes: Authorization: Bearer eyJhbGc...
    ↓
JwtAuthenticationFilter extracts token, verifies signature
    ↓
If valid: request proceeds. If invalid: 401 Unauthorized
```

**Key advantage**: 
- No session storage needed on server
- Easy to scale across multiple servers
- Mobile-friendly (same as web)

---

### 5. **REST API + Controllers কি?**

**সহজ ব্যাখ্যা**:
```
REST = Representational State Transfer

HTTP Methods + URLs = API Endpoints

GET    /api/users        → Fetch all users
POST   /api/users        → Create new user
GET    /api/users/{id}   → Fetch specific user
PUT    /api/users/{id}   → Update user
DELETE /api/users/{id}   → Delete user

Spring @RestController মতো automatically convert করে:
Java objects → JSON responses
JSON requests → Java objects
```

**SkiilEX Example**:
```java
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {
    private final SessionService sessionService;
    
    // GET /api/sessions
    @GetMapping
    public ResponseEntity<ApiResponse<List<SessionDto>>> getAllSessions(
        @RequestParam int page,
        @RequestParam int size
    ) {
        List<SessionDto> sessions = sessionService.getAllSessions(page, size);
        return ResponseEntity.ok(
            new ApiResponse<>(true, "Success", sessions)
        );
        // Spring automatically converts to JSON:
        // {
        //   "success": true,
        //   "message": "Success",
        //   "data": [...]
        // }
    }
    
    // POST /api/sessions
    @PostMapping
    public ResponseEntity<ApiResponse<SessionDto>> createSession(
        @Valid @RequestBody CreateSessionRequest req
    ) {
        SessionDto session = sessionService.createSession(req);
        return ResponseEntity.status(201).body(
            new ApiResponse<>(true, "Session created", session)
        );
    }
    
    // PUT /api/sessions/{id}/accept
    @PutMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<SessionDto>> acceptSession(
        @PathVariable int id
    ) {
        SessionDto session = sessionService.acceptSession(id);
        return ResponseEntity.ok(
            new ApiResponse<>(true, "Session accepted", session)
        );
    }
}
```

**SkiilEX has 100+ endpoints** across 30+ controllers:
```
AuthController (6 endpoints)
UserController (10 endpoints)
SkillController (8 endpoints)
SessionController (15 endpoints)
ExchangeController (10 endpoints)
MatchController (8 endpoints)
CommunityController (40 endpoints)
... and 23 more controllers
```

---

### 6. **Service Layer কি?**

**সহজ ব্যাখ্যা**:
```
Controller-তে সব business logic লেখা যায়, কিন্তু bad practice।

Good practice:
Controller → ReceiveHTTP request, validate input
          → Call Service

Service   → Actual business logic
          → Call Repository

Repository → Database operations

Benefits:
- Reusability (service call করতে পারে multiple controllers থেকে)
- Testability (service unit test করা সহজ)
- Single Responsibility (প্রতিটা ক্লাসের একটা responsibility)
```

**SkiilEX Example**:
```java
// Controller (just receives request, calls service)
@PostMapping("/match/{userId}")
public ResponseEntity<MatchDto> findMatch(@PathVariable UUID userId) {
    MatchDto match = matchService.findBestMatch(userId);  // Calls service
    return ResponseEntity.ok(match);
}

// Service (actual logic)
@Service
@RequiredArgsConstructor
public class MatchService {
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    
    public MatchDto findBestMatch(UUID userId) {
        // 1. Fetch user's wanted skills
        User user = userRepository.findById(userId).orElseThrow();
        List<Skill> wantedSkills = user.getSkillsWanted();
        
        // 2. Get all mentors who teach these skills
        List<User> potentialMentors = userRepository
            .findBySkillsOffered(wantedSkills);
        
        // 3. Rank by: trust_score, avg_rating, availability
        MatchDto bestMatch = potentialMentors.stream()
            .map(mentor -> calculateMatchScore(user, mentor))
            .max(Comparator.comparing(MatchDto::getScore))
            .orElseThrow();
        
        return bestMatch;
    }
    
    private MatchDto calculateMatchScore(User learner, User mentor) {
        double trustScore = skillTrustService.getAverageScore(mentor);
        double ratingScore = reviewService.getAverageRating(mentor);
        double matchScore = (trustScore * 0.4 + ratingScore * 0.6);
        return new MatchDto(mentor, matchScore);
    }
}

// Repository (DB operations)
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    List<User> findBySkillsOffered(List<Skill> skills);  // Spring generates SQL
}
```

---

### 7. **Transactions (@Transactional) কি?**

**সহজ ব্যাখ্যা**:
```
একাধিক database operations কে atomic করা (all-or-nothing)।

Example:
Money transfer: A → B
Step 1: Deduct from A's account
Step 2: Add to B's account

Problem: Step 1 succeeds, Step 2 fails → Money lost!

Solution: @Transactional
Step 1 + Step 2 = 1 transaction
If Step 2 fails → Entire transaction rollback (Step 1 also undoes)
```

**SkiilEX Example**:
```java
@Service
@RequiredArgsConstructor
public class ExchangeService {
    private final ExchangeRepository exchangeRepository;
    private final SessionService sessionService;
    private final CreditService creditService;
    
    @Transactional  // If any step fails, entire exchange.accept() fails
    public void acceptExchange(int exchangeId) {
        // Step 1: Update exchange status
        Exchange exchange = exchangeRepository.findById(exchangeId).orElseThrow();
        exchange.setStatus(ExchangeStatus.ACCEPTED);
        exchangeRepository.save(exchange);
        
        // Step 2: Create session
        Session session = sessionService.createSession(exchange);
        exchange.setSession(session);
        
        // Step 3: Reserve credits (deduct from learner, hold for mentor)
        creditService.reserveCredits(
            exchange.getRequesterId(), 
            exchange.getSkillId()
        );
        
        // If Step 3 fails: Step 1 & 2 automatically undo
        // → No orphaned session, no double charges
    }
}
```

---

### 8. **Events & Async Processing**

**সহজ ব্যাখ্যা**:
```
Scenario: Session completes
Tasks to do:
1. Update session status
2. Generate AI notes (takes 5-10 seconds!)
3. Award XP to users
4. Send notifications
5. Update skill trust score

Synchronous (blocks):
Session completes → notes generate → XP awarded → notifications sent
                   (user waits 10 secs!)

Asynchronous (non-blocking):
Session completes → Fire event → Immediately return to user
                               → Listener 1: Generate notes
                               → Listener 2: Award XP
                               → Listener 3: Send notification
                               (all happen in background)
```

**SkiilEX Implementation**:
```java
// Event publisher (in SessionService)
@Service
@RequiredArgsConstructor
public class SessionService {
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public void completeSession(int sessionId) {
        Session session = sessionRepository.findById(sessionId).orElseThrow();
        session.setStatus(SessionStatus.COMPLETED);
        sessionRepository.save(session);
        
        // Fire event (non-blocking)
        eventPublisher.publishEvent(
            new SessionCompletedEvent(
                sessionId, 
                session.getTeacherId(), 
                session.getLearnerId()
            )
        );
        // Return immediately! Listeners handle rest
    }
}

// Event listeners (triggered automatically)
@Component
public class SessionCompletedListeners {
    
    @EventListener
    public void generateNotes(SessionCompletedEvent event) {
        // Takes time, but doesn't block user
        noteGenerationService.generateNotesAsync(event.getSessionId());
    }
    
    @EventListener
    public void awardXP(SessionCompletedEvent event) {
        xpService.award(event.getTeacherId(), 50);
        xpService.award(event.getLearnerId(), 25);
    }
    
    @EventListener
    public void sendNotifications(SessionCompletedEvent event) {
        notificationService.sendTo(
            event.getTeacherId(), 
            "Session completed! AI notes generated."
        );
        notificationService.sendTo(
            event.getLearnerId(), 
            "Learning materials ready! Check your notes."
        );
    }
}
```

**Benefit**: 
- User gets immediate response
- Background tasks don't delay API
- System feels faster & more responsive

---

## PART B: DETAILED FEATURE EXPLANATIONS

### ✅ Feature 1: User Onboarding (কীভাবে কাজ করে?)

**Step-by-Step**:
```
1. নতুন ব্যবহারকারী Registration Form পূরণ করে
   Input: Email, Password, Name
   
2. Backend receives POST /api/auth/register
   @PostMapping("/register")
   public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
       // 1. Check email exists?
       if (userRepository.findByEmail(req.getEmail()).isPresent()) {
           throw new EmailAlreadyExists();
       }
       
       // 2. Hash password (bcrypt)
       String hashedPassword = passwordEncoder.encode(req.getPassword());
       
       // 3. Create user
       User user = new User(
           UUID.randomUUID(),
           req.getEmail(),
           hashedPassword,
           req.getName(),
           UserRole.STUDENT,
           UserLevel.NEWCOMER
       );
       
       // 4. Save to database
       userRepository.save(user);
       
       // 5. Create JWT token
       String token = jwtUtil.generateToken(user.getId(), user.getRole());
       
       // 6. Return token to frontend
       return ResponseEntity.ok(new AuthResponse(token, refreshToken, user.getId()));
   }

3. Frontend receives token, stores in sessionStorage

4. User logs in to dashboard

5. Add skills (what they teach, what they want to learn)
   POST /api/users/me/skills
   Payload: {skillId, proficiency_level}
   
   UserService.addSkill(userId, skillId, proficiency):
   - Save to user_skills_offered table (if teaching)
   - Save to user_skills_wanted table (if learning)
   
6. Profile complete! Now ready for matching.
```

---

### ✅ Feature 2: Skill Matching (সবচেয়ে গুরুত্বপূর্ণ!)

**Algorithm**:
```
Goal: Find best mentor for me to learn Python

1. My Data:
   - I want to learn: Python (skill_id = 1)
   - I teach: Photography (skill_id = 50)

2. Search candidates:
   Query: SELECT * FROM users u
          JOIN user_skills_offered uso ON u.id = uso.user_id
          WHERE skill_id = 1  -- Python teachers
   Result: [Alice, Bob, Charlie, ...]

3. Score each candidate:
   For each candidate:
     a) Trust Score (0.0-1.0)
        = average of skill_trust_score for (candidate, Python)
        
     b) Rating Score (0.0-5.0)
        = SELECT AVG(rating) FROM reviews WHERE reviewee_id = candidate
        
     c) Compatibility Score
        = similarity between (candidate's taught skills) 
          and (skills I teach)
        Using embeddings: vector similarity
        
     d) Final Match Score = 
        trust_score * 0.4 + 
        rating_score * 0.2 + 
        compatibility_score * 0.4

4. Rank candidates by score, return top 10

Result:
Alice (score: 0.92) ← Best match
Bob (score: 0.85)
Charlie (score: 0.78)
```

**Code**:
```java
@Service
@RequiredArgsConstructor
public class MatchService {
    
    public List<MatchDto> findBestMentors(UUID learnerId, int skillId, int limit) {
        // 1. Get learner's offered skills (for compatibility)
        User learner = userRepository.findById(learnerId).orElseThrow();
        List<Integer> learnerOfferedSkillIds = learner.getSkillsOffered()
            .stream().map(Skill::getId).collect(Collectors.toList());
        
        // 2. Query all mentors who teach target skill
        List<User> potentialMentors = userRepository
            .findMentorsBySkill(skillId);
        
        // 3. Score each mentor
        List<MatchDto> matches = potentialMentors.stream()
            .map(mentor -> {
                double trustScore = calculateTrustScore(mentor, skillId);
                double ratingScore = calculateRatingScore(mentor);
                double compatScore = calculateCompatibilityScore(
                    learnerOfferedSkillIds, 
                    mentor.getSkillsOffered()
                );
                double finalScore = (trustScore * 0.4 + 
                                    ratingScore * 0.2 + 
                                    compatScore * 0.4);
                
                return new MatchDto(mentor, finalScore);
            })
            .sorted(Comparator.comparing(MatchDto::getScore).reversed())
            .limit(limit)
            .collect(Collectors.toList());
        
        return matches;
    }
    
    private double calculateCompatibilityScore(
        List<Integer> learnerSkills, 
        List<Skill> mentorSkills
    ) {
        // Use embeddings to calculate semantic similarity
        List<Embedding> learnerEmbeddings = skillRepository
            .getEmbeddings(learnerSkills);
        List<Embedding> mentorEmbeddings = skillRepository
            .getEmbeddings(mentorSkills);
        
        // Cosine similarity between embedding vectors
        return cosineSimilarity(learnerEmbeddings, mentorEmbeddings);
    }
}
```

---

### ✅ Feature 3: One-on-One Session (সেশনের সম্পূর্ণ প্রক্রিয়া)

**Timeline**:
```
Day 1 (Matching):
┌─ Learner (Alice) sees mentor (Bob) in matches
├─ Alice clicks "Learn from Bob"
├─ POST /api/exchanges
│  ├─ Create exchange (PENDING)
│  ├─ Notify Bob: "Alice wants to learn React from you"
│  └─ Database: exchanges table
│
└─ Bob receives notification, clicks "Accept"
   ├─ Exchange status → ACCEPTED
   └─ Both notified: "Exchange accepted!"

Day 2-5 (Scheduling):
┌─ Alice / Bob choose session time
├─ POST /api/sessions
│  ├─ Create session (PROPOSED)
│  ├─ Generate Agora token
│  ├─ Create meetLink: "https://agora.io/room/session-123"
│  └─ Database: sessions table
│
└─ Both confirm time
   ├─ Session status → SCHEDULED
   └─ Calendar reminder sent 1 hour before

Day 6 (Session Day - 10:00 AM):
┌─ Bob (mentor) joins 5 min early
│  └─ POST /api/sessions/{id}/join
│     ├─ SessionRoomController.joinSession()
│     ├─ Fetch session details + Agora token
│     ├─ Initialize Agora SDK (video/audio)
│     ├─ Connect to room "session-123"
│     ├─ Start transcription: POST /api/sessions/{id}/transcribe
│     └─ raw_transcript starts recording in DB
│
├─ Alice joins 2 min late
│  └─ Same join process
│
├─ Teaching happens (30 min)
│  ├─ Bob screen shares React code
│  ├─ Alice watches
│  ├─ Real-time transcript updates: session_transcript table
│  ├─ transcript_live: "...const component = () => {..."
│  └─ Agora records all
│
└─ 10:30 AM: Session ends
   ├─ PATCH /api/sessions/{id}/complete
   ├─ Agora recording ends
   ├─ Transcript finalized
   ├─ Emit event: SessionCompletedEvent
   └─ Async listeners triggered:
      ├─ Listener 1: Generate AI notes
      │  ├─ Send transcript to Ollama
      │  ├─ Ollama processes (5-10 sec)
      │  ├─ Returns: key_points, action_items, flashcards, quiz
      │  └─ Store in session_note table
      │
      ├─ Listener 2: Award XP
      │  ├─ Bob gets 50 XP (teaching)
      │  ├─ Alice gets 25 XP (learning)
      │  └─ Update xp_event table
      │
      └─ Listener 3: Send notification
         ├─ Notify both users: "Session completed!"
         ├─ Notify Alice: "Your AI-generated notes are ready"
         └─ Notify Bob: "You earned 50 XP"

Day 6 Evening (Reviews & Trust):
┌─ Alice rates Bob
│  ├─ POST /api/reviews
│  ├─ Rating: 5 stars
│  ├─ Feedback: "Bob explained React hooks perfectly!"
│  ├─ Categories: clarity (5), preparation (5), helpfulness (5)
│  └─ Store in reviews table
│
├─ Bob rates Alice
│  ├─ Rating: 4 stars
│  ├─ Feedback: "Good questions, engaged learner"
│  └─ Store in reviews table
│
├─ Trigger: Update trust scores
│  ├─ skill_trust_score (Bob, React) = increases by 0.05
│  ├─ skill_trust_score (Alice, React) = increases (she's learner, not teaching)
│  └─ Both users' reputations improve
│
└─ Transaction complete
   ├─ Exchange status → COMPLETED
   ├─ Credit transaction logged
   └─ Next exchange/session can begin
```

---

### ✅ Feature 4: AI-Generated Notes (নোট জেনারেশন)

**Process**:
```
Input: Raw transcript from Agora
"uh so um react hooks were introduced in react 16.8 
let me show you how to use useState... basically you import useState 
from react and then in your component you declare a state variable 
like const username setUsername equals useState empty string..."

Process:
1. Clean transcript (remove "uh", "um", "like", etc.)
2. Identify key concepts (useState, React 16.8, state variable)
3. Generate structured output

Output (stored as JSON):

{
  "key_points": [
    "React hooks introduced in React 16.8",
    "useState is used for state management",
    "Import useState from 'react'",
    "Syntax: const [state, setState] = useState(initialValue)"
  ],
  
  "action_items": [
    "Practice useState with form inputs",
    "Build a counter app using hooks",
    "Learn useEffect lifecycle hooks",
    "Explore custom hooks"
  ],
  
  "flashcards": [
    {
      "q": "What is React hooks?",
      "a": "Hooks are functions that let you use state in functional components"
    },
    {
      "q": "Syntax of useState?",
      "a": "const [state, setState] = useState(initialValue)"
    },
    {
      "q": "When was hooks introduced?",
      "a": "React 16.8"
    }
  ],
  
  "quiz": [
    {
      "q": "Which hook manages component state?",
      "options": ["useEffect", "useState", "useContext", "useMemo"],
      "answer": 1
    },
    {
      "q": "React hooks can be used in class components",
      "options": ["True", "False"],
      "answer": 1
    }
  ]
}
```

**Backend Code**:
```java
@Component
public class SessionCompletedListener {
    
    @EventListener
    public void generateNotes(SessionCompletedEvent event) {
        SessionNoteGenerationTask task = new SessionNoteGenerationTask(
            event.getSessionId()
        );
        executor.submit(task);  // Run async in background
    }
}

@Component
@RequiredArgsConstructor
public class NoteGenerationService {
    
    public void generateNotes(int sessionId) {
        // 1. Fetch transcript
        Session session = sessionRepository.findById(sessionId).orElseThrow();
        String transcript = session.getSessionTranscript().getRawTranscript();
        
        // 2. Send to Ollama (local LLM)
        String prompt = """
            Extract from the following transcript:
            - Key learning points (5-7 bullet points)
            - Action items for the learner
            - 3-5 flashcard Q&A pairs
            - 2-3 quiz questions with answers
            
            Transcript:
            %s
        """.formatted(transcript);
        
        OllamaResponse response = ollamaService.generate(prompt);
        
        // 3. Parse Ollama response
        SessionNoteDto noteDto = parseOllamaResponse(response.getText());
        
        // 4. Store as JSON
        SessionNote note = new SessionNote(
            sessionId,
            noteDto.getKeyPoints(),
            noteDto.getActionItems(),
            noteDto.getFlashcards(),
            noteDto.getQuiz()
        );
        sessionNoteRepository.save(note);
        
        // 5. Notify user
        notificationService.send(
            session.getLearner().getId(),
            "Your AI-generated study materials are ready! "
            + "Check flashcards and quiz."
        );
    }
}
```

**Frontend Usage**:
```typescript
// User sees session notes in StudyMaterials component
const StudyMaterials = ({ sessionId }) => {
    const [notes, setNotes] = useState(null);
    
    useEffect(() => {
        // Fetch notes
        apiClient.get(`/sessions/${sessionId}/notes`).then(setNotes);
    }, [sessionId]);
    
    if (!notes) return <div>Loading study materials...</div>;
    
    return (
        <div>
            <h3>Key Points</h3>
            <ul>
                {notes.keyPoints.map(point => <li>{point}</li>)}
            </ul>
            
            <h3>Flashcards</h3>
            <FlashcardDeck cards={notes.flashcards} />
            
            <h3>Quiz</h3>
            <QuizComponent questions={notes.quiz} />
        </div>
    );
};
```

---

### ✅ Feature 5: Skill Chains (দুই বা তিনজনের মধ্যে বিনিময়)

**সহজ ব্যাখ্যা**:
```
একজন শেখায় যা অন্যজন চায়, এবং সেই অন্যজন শেখায় যা তৃতীয়জন চায়
ফলাফল: সবাই একে অপরকে শেখায়!

Example - 2-Person Chain:
Alice:  Teaches Python  ↔  Wants Photography
Bob:    Teaches Photography  ↔  Wants Python

Result: Alice and Bob exchange!
Alice teaches Bob Python, Bob teaches Alice Photography
In one session or sequential?
```

**Algorithm**:
```sql
WITH RECURSIVE skill_chain AS (
  -- Base case: Find starting user
  SELECT 
    u.id AS person_a,
    u.name,
    uso.skill_id AS teaches,
    usw.skill_id AS wants,
    CONCAT(u.id, '→') AS chain_path,
    1 AS depth
  FROM users u
  JOIN user_skills_offered uso ON u.id = uso.user_id
  JOIN user_skills_wanted usw ON u.id = usw.user_id
  WHERE uso.skill_id != usw.skill_id
  
  UNION ALL
  
  -- Recursive case: Find next person in chain
  SELECT 
    sc.person_a,
    sc.name,
    sc.teaches,
    usw2.skill_id,
    CONCAT(sc.chain_path, u2.id, '→'),
    sc.depth + 1
  FROM skill_chain sc
  JOIN users u2 ON u2.id != sc.person_a
  JOIN user_skills_offered uso2 ON u2.id = uso2.user_id 
    AND uso2.skill_id = sc.wants
  JOIN user_skills_wanted usw2 ON u2.id = usw2.user_id
  WHERE sc.depth < 5
)
SELECT * FROM skill_chain 
WHERE chain_path LIKE CONCAT('%→', person_a, '→%')  -- Found cycle!
LIMIT 20;
```

**Example Output**:
```
Person A    Name      Chain Path                    Depth   Teaches→Wants
Alice       "Alice"   "alice→bob→alice→"            3       "Python→React→Python"
```

**Frontend**: "3-way skill exchange opportunity found! Alice↔Bob with React-Python skills"

---

### ✅ Feature 6: Community Feed (সামাজিক বৈশিষ্ট্য)

**Posts Types**:
```
1. SHOWCASE: "I built a React app with Agora integration!"
   → Attract mentors, get hired
   
2. ACHIEVEMENT: "I completed Python learning path!"
   → Celebrate progress, earn badges
   
3. EXCHANGE: "Just did amazing React session with Bob!"
   → Testimonial, build trust
   
4. QUESTION: "How to optimize React rendering?"
   → Start discussion, get help
   
5. LEARNING: "Today I learned destructuring in Python"
   → Share knowledge, teach others
```

**Engagement**:
```
User creates post
    ↓
Posted to feed
    ↓
Other users:
├─ LIKE post (post_like table)
├─ COMMENT (comment table)
└─ SHARE (posts.shares counter)

Post visibility increases → reaches more users
Triggers: notification to post author
```

---

### ✅ Feature 7: Credits Economy (পয়েন্ট সিস্টেম)

**How It Works**:
```
Balance:        Initial = 100 credits
Earn:           Teaching session = +10 credits
Spend:          Learning from mentor = -5 credits (optional)

Flow:
Learner pays 5 credits → Goes to escrow (held)
                      ↓
Session happens
                      ↓
If completed: Mentor gets 10 credits (includes learner's 5)
If cancelled before: Learner gets 5 back

Ledger:
credit_transaction table logs every transaction:
{
  "id": 1,
  "user_id": "alice",
  "type": "SESSION_PAID",
  "amount": -5,
  "related_session_id": 123,
  "created_at": "2025-06-10"
}
```

---

### ✅ Feature 8: Moderation (নিরাপত্তা)

**3-Layer System**:
```
Layer 1: User Reports
┌─ User flags inappropriate post
├─ POST /api/moderation/reports
├─ Store in content_report table
└─ Auto-notification to admins

Layer 2: Admin Review
┌─ Admin opens reports dashboard
├─ GET /api/moderation/reports
├─ Reviews flagged content
└─ Creates moderation_case

Layer 3: Admin Action
┌─ Admin chooses action:
│  ├─ WARNING (first offense, user sees message)
│  ├─ RESTRICT (can't post for 7 days)
│  ├─ SUSPEND (can't use for 30 days)
│  └─ BAN (permanent)
│
├─ POST /api/moderation/actions
├─ Update user_restriction table
├─ Log in admin_audit_log (who, when, why)
└─ Notify user of action taken

Audit Trail:
admin_audit_log shows every admin action
→ Compliance & transparency
```

---

## PART C: সব Feature দের List (Present করার জন্য)

### When Asked: "সব Feature গুলি কীভাবে একসাথে কাজ করে?"

**Answer**:
```
┌─────────────────────────────────────────────────────────────┐
│  SKILLEX ECOSYSTEM (সবকিছু কীভাবে কানেক্টেড)              │
└─────────────────────────────────────────────────────────────┘

1. DISCOVERY PHASE:
   Sign up → Add skills → Browse mentors
   ↓
   Use: User registration, skill catalog, matching algorithm

2. MATCHING PHASE:
   Find mentors using: Embeddings, trust scores, ratings
   ↓
   Use: Skill embeddings, reviews, trust_score table

3. EXCHANGE PHASE:
   Create exchange request
   ↓
   Use: Exchanges table, notifications, connection requests

4. SESSION PHASE:
   Schedule + join video call
   ↓
   Use: Agora SDK, sessions table, real-time transcription

5. LEARNING PHASE:
   AI generates study materials
   ↓
   Use: Ollama, session_note, flashcards, quiz

6. EVALUATION PHASE:
   Rate mentor, build trust
   ↓
   Use: Reviews, trust_score, XP, badges

7. COMMUNITY PHASE:
   Share achievements, join circles
   ↓
   Use: Posts, discussions, skill_circles

8. MODERATION PHASE:
   Report, admin reviews, take action
   ↓
   Use: Moderation cases, user restrictions, audit logs

All layers communicate:
┌─────────────────────────────┐
│ Frontend (React)            │
│ ├─ User Interface           │
│ └─ Form Validation          │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│ Backend (Spring Boot)       │
│ ├─ Controllers (REST API)   │
│ ├─ Services (Business Lgc)  │
│ └─ Repositories (Database)  │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│ Database (MySQL)            │
│ ├─ 70+ tables               │
│ ├─ 100+ relations           │
│ └─ 43 migrations            │
└─────────────────────────────┘
             ↓
┌─────────────────────────────┐
│ External Services           │
│ ├─ Agora (video)            │
│ ├─ Ollama (AI notes)        │
│ ├─ Firebase (auth)          │
│ └─ Gmail (notifications)    │
└─────────────────────────────┘
```

---

## Quick Reference বাংলায়

### Q: "Database কেন 70+ টেবিল প্রয়োজন?"
A: সবকিছু আলাদা করা হয়েছে স্কেলেবিলিটি এবং রক্ষণাবেক্ষণের জন্য:
- User ম্যানেজমেন্ট: 6 টেবিল
- স্কিল সংক্রান্ত: 12 টেবিল
- সেশন: 10 টেবিল
- কমিউনিটি: 11 টেবিল
- বিশ্বাস ও খ্যাতি: 6 টেবিল
- ইত্যাদি

### Q: "Spring Boot কেন ব্যবহার করা হয়েছে?"
A:
1. দ্রুত API তৈরি (REST endpoints)
2. Database অপারেশন সহজ (Spring Data JPA)
3. নিরাপত্তা বিল্ট-ইন (Spring Security)
4. Dependency Injection (কোড সংগঠিত, পরিষ্কার)
5. বড় Java ইকোসিস্টেম (libraries সহজে পাওয়া যায়)

### Q: "JWT সিকিউরিটি সব ধরনের অ্যাপে কাজ করে?"
A: হাঁ!
- Web app: সেশন স্টোরেজে token রাখুন
- Mobile app: secure storage-এ রাখুন
- API client: প্রতিটি request-এ Authorization header পাঠান

### Q: "AI notes কত সময় লাগে তৈরি হতে?"
A: 5-10 সেকেন্ড (Ollama ব্যবহার করে, লোকাল এআই)
- Plus point: কোনো API কল নেই, নিজস্ব সার্ভারে চলে
- Cost: ০ টাকা (শুধু কম্পিউটার পাওয়ার)

---

## Tips for Exam:

✅ **Remember to say**:
- "70+ database tables across 9 domains"
- "Spring Boot 3 with Java 21"
- "JWT stateless authentication"
- "Ollama for local AI (no API costs)"
- "Agora for video/audio calls"
- "Real-time transcription + async note generation"
- "Event-driven architecture"

✅ **Explain the flow**:
1. Sign up → Add skills
2. Browse mentors (matching)
3. Schedule session
4. Join video + transcribe
5. Session ends → AI notes generated
6. Rate mentor → trust score increases
7. Share achievement → community engagement

❌ **Don't say**:
- "I use ML models" (just Ollama, not custom ML)
- "50+ databases" (it's ~70 tables, not databases)
- "Everything is real-time" (only transcription + some notifications)
