# SkiilEX: Database Layer Structure & Location

> **Detailed Guide** — Where database code lives and how each layer works together.

---

## DIRECTORY STRUCTURE (Database Layer)

```
backend/
├── src/main/
│   ├── java/com/skillex/
│   │   ├── model/              ← JPA Entity Classes (Database Schema)
│   │   │   ├── User.java
│   │   │   ├── Skill.java
│   │   │   ├── Session.java
│   │   │   ├── Exchange.java
│   │   │   ├── Review.java
│   │   │   ├── Post.java
│   │   │   ├── Message.java
│   │   │   ├── Notification.java
│   │   │   ├── LearningPath.java
│   │   │   ├── LearningPathStep.java
│   │   │   ├── GroupSession.java
│   │   │   ├── SkillTrustScore.java
│   │   │   ├── Connection.java
│   │   │   ├── ModulerationCase.java
│   │   │   ├── UserRestriction.java
│   │   │   ├── AdminAuditLog.java
│   │   │   ├── XpEvent.java
│   │   │   ├── CreditTransaction.java
│   │   │   ├── Discussion.java
│   │   │   ├── DiscussionReply.java
│   │   │   ├── SkillCircle.java
│   │   │   ├── SkillCircleMembers.java
│   │   │   ├── Event.java
│   │   │   ├── EventRsvp.java
│   │   │   ├── SessionTranscript.java
│   │   │   ├── SessionNote.java
│   │   │   ├── UserBadge.java
│   │   │   ├── UserProgress.java
│   │   │   └── ... (40+ more entities)
│   │   │
│   │   ├── repository/         ← Spring Data JPA Repositories
│   │   │   ├── UserRepository.java
│   │   │   ├── SkillRepository.java
│   │   │   ├── SessionRepository.java
│   │   │   ├── ExchangeRepository.java
│   │   │   ├── ReviewRepository.java
│   │   │   ├── PostRepository.java
│   │   │   ├── MessageRepository.java
│   │   │   ├── NotificationRepository.java
│   │   │   ├── LearningPathRepository.java
│   │   │   ├── LearningPathStepRepository.java
│   │   │   ├── GroupSessionRepository.java
│   │   │   ├── SkillTrustScoreRepository.java
│   │   │   ├── ConnectionRepository.java
│   │   │   ├── ModulerationCaseRepository.java
│   │   │   ├── UserRestrictionRepository.java
│   │   │   ├── AdminAuditLogRepository.java
│   │   │   ├── XpEventRepository.java
│   │   │   ├── CreditTransactionRepository.java
│   │   │   ├── DiscussionRepository.java
│   │   │   ├── DiscussionReplyRepository.java
│   │   │   ├── SkillCircleRepository.java
│   │   │   ├── SkillCircleMembersRepository.java
│   │   │   ├── EventRepository.java
│   │   │   ├── EventRsvpRepository.java
│   │   │   ├── SessionTranscriptRepository.java
│   │   │   ├── SessionNoteRepository.java
│   │   │   ├── UserBadgeRepository.java
│   │   │   ├── UserProgressRepository.java
│   │   │   └── ... (29+ more repositories)
│   │   │
│   │   └── service/            ← Business Logic Layer
│   │       ├── UserService.java
│   │       ├── SkillService.java
│   │       ├── SessionService.java
│   │       ├── ExchangeService.java
│   │       ├── ReviewService.java
│   │       ├── MatchService.java
│   │       ├── NoteGenerationService.java
│   │       ├── ... (47+ more services)
│   │
│   └── resources/db/migration/ ← Flyway SQL Migrations
│       ├── V1__Initial_Setup.sql
│       ├── V2__Add_Skills_Table.sql
│       ├── V3__Add_Sessions_Table.sql
│       ├── V4__Add_Exchanges_Table.sql
│       ├── V5__Add_Reviews_Table.sql
│       ├── V6__Add_Embeddings_Column.sql
│       ├── V7__Add_Indexes.sql
│       ├── ...
│       └── V43__Latest_Features.sql

└── build.gradle               ← Gradle config (Spring Boot dependencies)
```

---

## How Each Layer Works

### Layer 1: Entity Classes (`model/` folder)

**What**: Java classes that represent database tables

**Example**:
```java
// File: backend/src/main/java/com/skillex/model/User.java

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    private UUID id;  // Primary Key
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String name;
    
    @Column
    private String bio;
    
    @Enumerated(EnumType.STRING)
    private UserRole role;  // STUDENT, MENTOR, ADMIN
    
    @Enumerated(EnumType.STRING)
    private UserLevel level;  // NEWCOMER, INTERMEDIATE, ADVANCED, EXPERT, MASTER
    
    @Column
    private String passwordHash;
    
    @Column
    private String avatarUrl;
    
    @Column
    private Integer skillexScore = 0;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    // RELATIONSHIPS
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UserSkillOffered> skillsOffered = new ArrayList<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UserSkillWanted> skillsWanted = new ArrayList<>();
    
    @OneToMany(mappedBy = "teacher")
    private List<Session> teachingSessions;
    
    @OneToMany(mappedBy = "learner")
    private List<Session> learningSessions;
    
    @OneToMany(mappedBy = "reviewer")
    private List<Review> reviewsGiven;
    
    @OneToMany(mappedBy = "reviewee")
    private List<Review> reviewsReceived;
}
```

**JPA Annotations Explained**:
- `@Entity` — This class maps to a database table
- `@Table(name = "users")` — Table name is "users"
- `@Id` — This is the primary key (must be unique)
- `@Column` — This is a column in the table
- `@Enumerated(EnumType.STRING)` — Store enum as string ("STUDENT", "MENTOR", etc.)
- `@OneToMany` — One user has many sessions (relationship)
- `@CreationTimestamp` — Auto-set to current time when created
- `@UpdateTimestamp` — Auto-update to current time on every save

**Database Table Generated**:
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  role VARCHAR(50),
  level VARCHAR(50),
  password_hash VARCHAR(255),
  avatar_url VARCHAR(500),
  skillex_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### Layer 2: Repositories (`repository/` folder)

**What**: Java interfaces that handle database queries

**Example**:
```java
// File: backend/src/main/java/com/skillex/repository/UserRepository.java

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    // Spring auto-generates SQL from method name!
    Optional<User> findByEmail(String email);
    // → SELECT * FROM users WHERE email = ?
    
    List<User> findByRole(UserRole role);
    // → SELECT * FROM users WHERE role = ?
    
    List<User> findByLevelGreaterThanEqual(UserLevel level);
    // → SELECT * FROM users WHERE level >= ?
    
    @Query("SELECT u FROM User u WHERE u.skillexScore > :score ORDER BY u.skillexScore DESC")
    List<User> findTopRankedUsers(@Param("score") int score);
    // → Custom JPQL query (Java Persistence Query Language)
    
    @Query(value = "SELECT u.* FROM users u " +
                   "JOIN user_skills_offered uso ON u.id = uso.user_id " +
                   "WHERE uso.skill_id = ?1",
           nativeQuery = true)
    List<User> findMentorsBySkill(int skillId);
    // → Native SQL query
    
    @EntityGraph("user.withSkills")  // Prevent N+1 query problem
    List<User> findByRole(UserRole role);
    // → Fetch user + skills in ONE query (not multiple)
    
    boolean existsByEmail(String email);
    // → SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)
    
    void deleteByEmail(String email);
    // → DELETE FROM users WHERE email = ?
}
```

**How Spring Magic Works**:
```
Method Name: findByEmailAndRole
             ├─ find    = SELECT
             ├─ By      = WHERE
             ├─ Email   = email column
             ├─ And     = AND operator
             └─ Role    = role column

Translates to:
→ SELECT * FROM users WHERE email = ? AND role = ?
```

**Custom Repositories** (when method name isn't enough):
```java
@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {
    
    // Auto-generated
    List<Session> findByTeacherId(UUID teacherId);
    List<Session> findByStatus(SessionStatus status);
    
    // Custom JPQL (Java Persistence Query Language)
    @Query("SELECT s FROM Session s " +
           "WHERE s.teacher.id = :teacherId " +
           "AND s.status = 'COMPLETED' " +
           "ORDER BY s.completedAt DESC")
    List<Session> findCompletedSessionsByTeacher(@Param("teacherId") UUID teacherId);
    
    // Native SQL (raw MySQL)
    @Query(value = "SELECT s.*, COUNT(r.id) as review_count " +
                   "FROM sessions s " +
                   "LEFT JOIN reviews r ON s.id = r.session_id " +
                   "GROUP BY s.id " +
                   "HAVING COUNT(r.id) > 5",
           nativeQuery = true)
    List<Session> findPopularSessions();
    
    // Pagination (for feed, search results)
    Page<Session> findByStatusOrderByCreatedAtDesc(
        SessionStatus status, 
        Pageable pageable
    );
    // Usage: Page<Session> page = repo.find(..., PageRequest.of(0, 10));
    //        → Returns sessions 0-10 in ascending order
}
```

**Relationship Queries**:
```java
@Repository
public interface ExchangeRepository extends JpaRepository<Exchange, Integer> {
    
    // Find exchanges involving specific user
    List<Exchange> findByRequesterIdOrReceiverId(UUID requesterId, UUID receiverId);
    // → SELECT * FROM exchanges WHERE requester_id = ? OR receiver_id = ?
    
    // Find with relationships
    @EntityGraph(attributePaths = {"requester", "receiver", "offeredSkill", "wantedSkill"})
    Optional<Exchange> findById(int id);
    // → Single query fetches all related data (no N+1)
    
    // Count by status
    long countByStatus(ExchangeStatus status);
    // → SELECT COUNT(*) FROM exchanges WHERE status = ?
    
    // Exists check
    boolean existsByRequesterIdAndReceiverId(UUID requesterId, UUID receiverId);
    // → SELECT EXISTS(SELECT 1 FROM exchanges WHERE requester_id = ? AND receiver_id = ?)
}
```

**Key Benefit of Repositories**:
- **No SQL injection**: Parameters auto-escaped
- **Type-safe**: Compiler catches errors
- **Testable**: Easy to mock for unit tests
- **Maintainable**: Method names are self-documenting

---

### Layer 3: Service Classes (`service/` folder)

**What**: Business logic that uses repositories

**Example**:
```java
// File: backend/src/main/java/com/skillex/service/UserService.java

@Service
@RequiredArgsConstructor  // Lombok: generates constructor
public class UserService {
    
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    
    // 1. User Registration Logic
    public AuthResponseDto registerUser(RegisterRequestDto req) {
        // Business logic:
        
        // 1.1 Check if email already exists
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new EmailAlreadyExistsException("Email in use");
        }
        
        // 1.2 Validate password strength
        if (!isStrongPassword(req.getPassword())) {
            throw new WeakPasswordException("Password too weak");
        }
        
        // 1.3 Hash password
        String hashedPassword = passwordEncoder.encode(req.getPassword());
        
        // 1.4 Create user entity
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(req.getEmail());
        user.setName(req.getName());
        user.setPasswordHash(hashedPassword);
        user.setRole(UserRole.STUDENT);
        user.setLevel(UserLevel.NEWCOMER);
        user.setSkillexScore(0);
        
        // 1.5 Save to database
        User savedUser = userRepository.save(user);
        
        // 1.6 Generate JWT token
        String token = jwtUtil.generateToken(
            savedUser.getId(),
            savedUser.getRole()
        );
        
        // 1.7 Return response
        return new AuthResponseDto(
            token,
            savedUser.getId(),
            savedUser.getEmail()
        );
    }
    
    // 2. Get User Profile (with skills)
    public UserProfileDto getUserProfile(UUID userId) {
        // Business logic:
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
        
        // Fetch related data
        List<UserSkillOffered> offered = user.getSkillsOffered();
        List<UserSkillWanted> wanted = user.getSkillsWanted();
        
        double avgRating = reviewService.getAverageRating(userId);
        int sessionCount = sessionRepository.countByTeacherId(userId);
        
        return UserProfileDto.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .bio(user.getBio())
            .level(user.getLevel())
            .skillexScore(user.getSkillexScore())
            .skillsOffered(offered)
            .skillsWanted(wanted)
            .avgRating(avgRating)
            .sessionsTaught(sessionCount)
            .build();
    }
    
    // 3. Update User Skills
    @Transactional
    public void addSkill(UUID userId, int skillId, ProficiencyLevel level, boolean isOffering) {
        User user = userRepository.findById(userId).orElseThrow();
        
        if (isOffering) {
            UserSkillOffered offered = new UserSkillOffered();
            offered.setUser(user);
            offered.setSkill(skillRepository.findById(skillId).orElseThrow());
            offered.setProficiencyLevel(level);
            
            userSkillOfferedRepository.save(offered);
        } else {
            UserSkillWanted wanted = new UserSkillWanted();
            wanted.setUser(user);
            wanted.setSkill(skillRepository.findById(skillId).orElseThrow());
            wanted.setProficiencyLevelTarget(level);
            
            userSkillWantedRepository.save(wanted);
        }
    }
    
    // 4. Search Users
    public Page<UserSearchResultDto> searchUsers(String query, Pageable pageable) {
        // Business logic:
        
        // Case-insensitive search
        return userRepository
            .findByNameContainingIgnoreCaseOrBioContainingIgnoreCase(
                query, 
                query, 
                pageable
            )
            .map(user -> new UserSearchResultDto(
                user.getId(),
                user.getName(),
                user.getLevel(),
                user.getSkillexScore()
            ));
    }
}
```

**Why Services**:
- ✅ Reusable across multiple controllers
- ✅ Testable (easy to mock dependencies)
- ✅ Encapsulates complex business logic
- ✅ Separates concerns (controller ≠ business logic ≠ database)

---

### Layer 4: Flyway Migrations (`resources/db/migration/` folder)

**What**: SQL files that define and evolve the database schema

**Why Migrations**:
```
Problem: Multiple developers, need to synchronize database changes
Solution: Version-controlled SQL files that run in order

Timeline:
Developer 1: Creates V1__Initial_Setup.sql
            → Creates users, skills tables
Developer 2: Creates V2__Add_Sessions_Table.sql
            → Adds sessions table
Developer 3: Creates V3__Add_Indexes.sql
            → Adds performance indexes

Result: All developers have SAME database structure
        Can track who changed what, when, why (git history)
```

**Example Migrations**:

```sql
-- File: V1__Initial_Setup.sql
-- Runs ONCE at startup

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    level VARCHAR(50) DEFAULT 'NEWCOMER',
    role VARCHAR(50) DEFAULT 'STUDENT',
    skillex_score INT DEFAULT 0,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

CREATE TABLE skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(50),
    icon_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
);
```

```sql
-- File: V2__Add_Sessions_Table.sql
-- Runs AFTER V1, before V3

CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id VARCHAR(36) NOT NULL,
    learner_id VARCHAR(36) NOT NULL,
    skill_id INT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    duration_mins INT DEFAULT 30,
    status VARCHAR(50) DEFAULT 'PROPOSED',
    session_type VARCHAR(50),
    meet_link VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (learner_id) REFERENCES users(id),
    FOREIGN KEY (skill_id) REFERENCES skills(id),
    INDEX idx_teacher_status (teacher_id, status),
    INDEX idx_learner_status (learner_id, status),
    INDEX idx_scheduled_at (scheduled_at)
);
```

```sql
-- File: V3__Add_Transcripts.sql

CREATE TABLE session_transcript (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL UNIQUE,
    raw_transcript TEXT,
    processed_transcript TEXT,
    quality_score FLOAT,
    transcription_started_at TIMESTAMP,
    transcription_completed_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE session_note (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL UNIQUE,
    key_points JSON,
    action_items JSON,
    flashcards JSON,
    quiz JSON,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**Flyway Naming Convention**:
```
V{VERSION}__{DESCRIPTION}.sql

V1__Initial_Setup.sql
V2__Add_Sessions.sql
V3__Add_Indexes.sql
V10__Add_Moderation.sql   ← Notice: V10, not V3 (version number increases)
V11__Fix_Foreign_Keys.sql

⚠️ Important: Version numbers MUST increase!
    ✅ V1, V2, V3, V4...
    ❌ V1, V2, V1, V3 (wrong! Flyway will fail)
```

**How Migrations Run**:
```
1. Flyway checks: Which migrations have been run?
   → Stores in flyway_schema_history table

2. If V1 & V2 already run:
   → Skip them, start from V3

3. Run V3:
   ├─ Execute SQL
   ├─ Update database
   └─ Record in flyway_schema_history

4. Run V4, V5, etc. in order

5. If V5 fails:
   ├─ STOP
   ├─ Don't run V6, V7...
   └─ Admin must fix V5 and re-run

Benefits:
✅ Reproducible: Same migration on dev, test, production
✅ Version-controlled: See git history of schema changes
✅ Reversible: Can revert database by running backwards (with undo)
✅ Trackable: Know exactly when table created, when index added, etc.
```

**43 Migrations in SkiilEX**:
```
V1–V5:    Core tables (users, skills, sessions, exchanges, reviews)
V6–V10:   Community (posts, discussions, circles, messages, notifications)
V11–V15:  Advanced (learning_paths, skill_checks, assessments)
V16–V20:  AI features (transcripts, notes, embeddings)
V21–V25:  Moderation (reports, cases, restrictions)
V26–V30:  Performance (indexes, views)
V31–V35:  New features (group_sessions, certificates)
V36–V40:  Business logic (credits, xp, badges)
V41–V43:  Bug fixes and tweaks
```

---

## Data Flow Diagram (Front to Back to Database)

```
FRONTEND (React)
    ↓
    User fills registration form
    Clicks "Register"
    
REST API REQUEST:
    ↓
POST /api/auth/register
Content-Type: application/json
Body: {
  "email": "alice@example.com",
  "password": "securePass123",
  "name": "Alice Johnson"
}

BACKEND - CONTROLLER LAYER:
    ↓
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@RequestBody RegisterRequestDto req) {
        // 1. Receive HTTP request
        // 2. Call service
        AuthResponseDto response = authService.registerUser(req);
        // 3. Return HTTP response
        return ResponseEntity.ok(response);
    }
}

BACKEND - SERVICE LAYER:
    ↓
@Service
public class AuthService {
    public AuthResponseDto registerUser(RegisterRequestDto req) {
        // 1. Validate email unique
        // 2. Hash password
        // 3. Create User object
        User user = new User(...);
        // 4. Call repository to save
        User savedUser = userRepository.save(user);
        // 5. Generate JWT token
        String token = jwtUtil.generateToken(savedUser.getId(), ...);
        // 6. Return response DTO
        return new AuthResponseDto(token, ...);
    }
}

BACKEND - REPOSITORY LAYER:
    ↓
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
}

// When userRepository.save(user) called:
// Spring Data JPA converts to SQL:
// INSERT INTO users (id, email, password_hash, name, ...)
// VALUES ('uuid-123', 'alice@example.com', 'hashed...', 'Alice Johnson', ...)

DATABASE LAYER:
    ↓
MySQL receives SQL query
    ↓
INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    level,
    role,
    skillex_score,
    created_at,
    updated_at
) VALUES (
    'a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p',
    'alice@example.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86AGR0Hs', ← bcrypt hash
    'Alice Johnson',
    'NEWCOMER',
    'STUDENT',
    0,
    '2025-06-11 10:30:45',
    '2025-06-11 10:30:45'
);

RESULT:
    ↓
Row inserted successfully
Row ID: 1 (auto-increment)

RETURN TO BACKEND:
    ↓
userRepository.save() returns User object with ID set
Service creates JWT token
Service returns AuthResponseDto

RETURN TO FRONTEND:
    ↓
HTTP 200 OK
Content-Type: application/json
Body: {
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p",
  "email": "alice@example.com"
}

FRONTEND PROCESSES RESPONSE:
    ↓
Extract token from response
Store in sessionStorage
Redirect to /dashboard
Include token in all future requests:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NEXT REQUEST (Get User Profile):
    ↓
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

BACKEND - SECURITY FILTER:
    ↓
JwtAuthenticationFilter extracts token
Verifies signature (still valid?)
Extracts userId from token
Sets request.setAttribute("userId", userId)

BACKEND - CONTROLLER:
    ↓
@GetMapping("/me")
public ResponseEntity<UserProfileDto> getMe() {
    UUID userId = (UUID) request.getAttribute("userId");
    UserProfileDto profile = userService.getUserProfile(userId);
    return ResponseEntity.ok(profile);
}

BACKEND - SERVICE:
    ↓
User user = userRepository.findById(userId).orElseThrow();
// Fetch related data
List<UserSkillOffered> skills = user.getSkillsOffered();
// Build DTO with all related data

DATABASE:
    ↓
SELECT * FROM users WHERE id = 'a1b2c3d4...';
SELECT * FROM user_skills_offered WHERE user_id = 'a1b2c3d...';

RETURN TO FRONTEND:
    ↓
UserProfileDto with all user info + skills

FRONTEND DISPLAY:
    ↓
Render profile page: "Welcome Alice!"
Display skills: Photography (EXPERT), Python (BEGINNER)
```

---

## Common Database Queries You Might Need

### 1. Find mentors for a skill
```java
// In SkillService
@Transactional(readOnly = true)
public List<UserDto> findMentorsForSkill(int skillId, Pageable pageable) {
    return userRepository
        .findMentorsBySkill(skillId, pageable)
        .map(UserDto::from)
        .getContent();
}

// In UserRepository
@Query(value = "SELECT DISTINCT u.* FROM users u " +
               "JOIN user_skills_offered uso ON u.id = uso.user_id " +
               "WHERE uso.skill_id = ?1 " +
               "ORDER BY u.skillex_score DESC",
       nativeQuery = true)
List<User> findMentorsBySkill(int skillId, Pageable pageable);
```

### 2. Get user's completed sessions
```java
// In SessionService
public List<SessionDto> getCompletedSessions(UUID userId, Pageable pageable) {
    return sessionRepository
        .findByTeacherIdAndStatusOrderByCompletedAtDesc(
            userId, 
            SessionStatus.COMPLETED,
            pageable
        )
        .map(SessionDto::from)
        .getContent();
}

// In SessionRepository
Page<Session> findByTeacherIdAndStatusOrderByCompletedAtDesc(
    UUID teacherId, 
    SessionStatus status,
    Pageable pageable
);
```

### 3. Calculate user rating
```java
// In ReviewService
public double getUserAverageRating(UUID userId) {
    return reviewRepository
        .findByRevieweeId(userId)
        .stream()
        .mapToDouble(Review::getRating)
        .average()
        .orElse(0.0);
}

// In ReviewRepository
@Query("SELECT AVG(r.rating) FROM Review r WHERE r.reviewee.id = :userId")
Double getAverageRatingForUser(@Param("userId") UUID userId);
```

### 4. Find user's pending connections
```java
// In ConnectionService
public List<ConnectionDto> getPendingConnections(UUID userId) {
    return connectionRepository
        .findByReceiverIdAndStatus(userId, ConnectionStatus.PENDING)
        .stream()
        .map(ConnectionDto::from)
        .collect(Collectors.toList());
}

// In ConnectionRepository
List<Connection> findByReceiverIdAndStatus(UUID receiverId, ConnectionStatus status);
```

---

## Performance Optimization Tips

### 1. Use @EntityGraph to prevent N+1 queries
```java
// ❌ Without @EntityGraph (N+1 problem):
List<User> users = userRepository.findAll();
for (User user : users) {
    List<Skill> skills = user.getSkillsOffered();  // Separate query for EACH user!
    // 1 query for users + 100 queries for skills = 101 queries!
}

// ✅ With @EntityGraph:
@EntityGraph(attributePaths = "skillsOffered")
List<User> findAll();
// 1 JOIN query fetches both users and skills!
```

### 2. Add indexes for frequently searched columns
```sql
CREATE INDEX idx_user_email ON users(email);  -- Fast email lookup
CREATE INDEX idx_session_teacher_status ON sessions(teacher_id, status);  -- Compound index
CREATE INDEX idx_created_at ON posts(created_at DESC);  -- For feed queries
```

### 3. Use pagination for large result sets
```java
// ❌ Bad: Load all 100,000 users
List<User> allUsers = userRepository.findAll();

// ✅ Good: Load 10 at a time
Page<User> page = userRepository.findAll(PageRequest.of(0, 10));
// Returns: users 0-10
// Total: 100,000
// Total pages: 10,000
```

---

## Summary Table

| Layer | Location | Purpose | Example |
|-------|----------|---------|---------|
| **Entity** | `model/` | Define DB schema as Java | `User.java`, `Session.java` |
| **Repository** | `repository/` | Query database | `UserRepository`, `SessionRepository` |
| **Service** | `service/` | Business logic | `UserService`, `SessionService` |
| **Migration** | `resources/db/migration/` | Version DB schema | `V1__Initial_Setup.sql` |
| **Controller** | `controller/` | Handle HTTP requests | `UserController`, `SessionController` |

---

## Answering Interview Questions

### Q: "Where is database code located?"
**A**: In three places:
1. **Entity classes** (`model/`) — Define what tables look like
2. **Repositories** (`repository/`) — How to query the database
3. **Migrations** (`resources/db/migration/`) — SQL to create tables
4. **Service classes** use all above

### Q: "How do you create a new table?"
**A**:
1. Create Java entity class in `model/`
2. Use JPA annotations (`@Entity`, `@Table`, `@Column`)
3. Create migration file `V{num}__Description.sql`
4. Write CREATE TABLE SQL
5. Spring + Flyway automatically sets up everything

### Q: "How is data fetched from database?"
**A**: 
1. Controller receives HTTP request
2. Calls Service method
3. Service calls Repository method
4. Repository generates SQL using Spring Data
5. Executes query against MySQL
6. Returns result to Service
7. Service processes/transforms data
8. Controller returns JSON to frontend

### Q: "How do you prevent SQL injection?"
**A**: Use repositories with parameterized queries:
```java
userRepository.findByEmail(email);  // ✅ Email param is escaped
// NOT: "SELECT * FROM users WHERE email = '" + email + "'";  // ❌ Vulnerable!
```
