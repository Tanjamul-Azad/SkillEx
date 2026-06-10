# AI Tutor Bot - Complete Flow Diagram

## User Journey

```
User Opens Dashboard
    ↓
User Clicks "Learn with AI Tutor" for a skill
    ↓
Navigation to /ai/tutor/{skillId}
    ↓
TutorBotPage loads
    ↓
    ├─ Load skill details from SkillService
    ├─ Load conversation via useTutorConversation hook
    ├─ Fetch from tutorBotService.getConversation()
    │   ├─ API calls GET /api/tutor/{skillId}/history
    │   └─ Backend fetches from database
    └─ Display TutorChatBox with message history
```

## Message Flow

```
User Types Question
    ↓
User Presses Enter
    ↓
TutorChatBox.handleSend()
    ↓
useTutorConversation.sendMessage(content)
    ↓
tutorBotService.sendMessage(skillId, message)
    ↓
API POST /api/tutor/{skillId}/message
    ↓
TutorBotController.sendMessage()
    ↓
TutorBotServiceImpl.sendMessage()
    ├─ Validate user exists
    ├─ Validate skill exists
    ├─ Get or create conversation
    ├─ Load message history from JSON
    ├─ Add user message
    ├─ Load session notes context
    ├─ Build prompt for Ollama
    ├─ Call aiProvider.generateText()
    │   └─ HTTP request to localhost:11434/api/generate
    │       └─ Ollama (gemma2:2b) processes prompt
    │           └─ Returns response
    ├─ Determine if quiz should be asked
    ├─ Add tutor response (with optional metadata)
    ├─ Serialize messages to JSON
    ├─ Save to database
    └─ Return TutorMessageDto
    ↓
API returns response
    ↓
useTutorConversation updates local state
    ↓
TutorChatBox re-renders with new message
    ↓
Message appears on screen with animation
    ↓
Auto-scroll to bottom of chat
```

## Quiz Flow (every 4-6 messages)

```
TutorBotServiceImpl detects quiz should be asked
    ↓
Generate quiz question via Ollama
    ↓
Create TutorMessageMetadata with:
    ├─ isQuiz: true
    ├─ quizType: "multiple-choice"
    ├─ quizOptions: [optionA, optionB, optionC, optionD]
    ├─ correctAnswerIndex: 2
    └─ answerFeedback: "Explanation..."
    ↓
Return as TutorMessageDto
    ↓
Frontend renders quiz message
    ↓
TutorChatBox detects metadata.isQuiz = true
    ↓
Display option buttons with A/B/C/D labels
    ↓
User selects an option
    ↓
TutorQuizMode component shows selection
    ↓
User clicks "Check Answer"
    ↓
useTutorConversation.submitQuizAnswer()
    ↓
API POST /api/tutor/{skillId}/quiz-answer
    ↓
TutorBotController.submitQuizAnswer()
    ↓
TutorBotServiceImpl.submitQuizAnswer()
    ├─ Find quiz question message
    ├─ Compare answer to correctAnswerIndex
    ├─ Generate feedback message
    ├─ Record quiz attempt
    ├─ Update conversation stats:
    │   ├─ totalQuestionsAsked++
    │   ├─ questionsAnsweredCorrectly++ (if correct)
    │   └─ recalculateAccuracy()
    ├─ Save to database
    └─ Return feedback message
    ↓
Frontend displays feedback
    ↓
User sees "Correct!" or "Not quite" with explanation
    ↓
Stats update in header (accuracy %)
```

## Database Interaction

```
INITIAL STATE:
┌─────────────────────────────────────────────┐
│ tutor_bot_conversations TABLE               │
├─────────────────────────────────────────────┤
│ Empty (no conversations yet)                │
└─────────────────────────────────────────────┘

AFTER FIRST MESSAGE:
┌─────────────────────────────────────────────────────────────────┐
│ tutor_bot_conversations TABLE                                   │
├─────────────────────────────────────────────────────────────────┤
│ id           │ user_id      │ skill_id     │ messages_json     │
├──────────────┼──────────────┼──────────────┼───────────────────┤
│ uuid-123     │ user-456     │ skill-789    │ [{                │
│              │              │              │   "id": "msg-1",  │
│              │              │              │   "role": "user", │
│              │              │              │   "content": "..." │
│              │              │              │ }, {              │
│              │              │              │   "id": "msg-2",  │
│              │              │              │   "role": "tutor",│
│              │              │              │   "content": "..." │
│              │              │              │ }]                │
│ accuracy_pct │ total_q      │ answered_ok  │ active            │
│ NULL         │ 0            │ 0            │ true              │
└─────────────────────────────────────────────────────────────────┘

AFTER QUIZ ANSWER:
┌─────────────────────────────────────────────────────────────────┐
│ tutor_bot_conversations TABLE                                   │
├─────────────────────────────────────────────────────────────────┤
│ accuracy_pct │ total_q      │ answered_ok  │ last_interaction  │
├──────────────┼──────────────┼──────────────┼───────────────────┤
│ 100.0        │ 1            │ 1            │ 2026-06-11...     │
└─────────────────────────────────────────────────────────────────┘

AFTER 3 QUIZZES (2 correct, 1 wrong):
┌─────────────────────────────────────────────────────────────────┐
│ accuracy_pct │ total_q      │ answered_ok  │                   │
├──────────────┼──────────────┼──────────────┤                   │
│ 66.67        │ 3            │ 2            │                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.tsx
  ↓
  Routes
    ↓
    <Route path="/ai/tutor/:skillId" element={<TutorBotPage />} />
      ↓
      TutorBotPage
        ├─ useAuth() - Get current user
        ├─ useParams() - Extract skillId from URL
        ├─ useTutorConversation(skillId) - Manage conversation
        │   └─ Calls tutorBotService API methods
        │       └─ axios/fetch to backend
        ├─ Header
        │   ├─ Back button
        │   ├─ Skill name and icon
        │   ├─ Stats display (questions, accuracy %)
        │   └─ Settings button
        │       └─ Settings Panel (conditional)
        │           ├─ Clear Messages button
        │           └─ Delete Conversation button
        │
        └─ TutorChatBox (main content)
            ├─ Message List
            │   └─ For each message:
            │       ├─ User message (blue, right-aligned)
            │       └─ Tutor message (gray, left-aligned)
            │           ├─ Message content
            │           ├─ Timestamp
            │           └─ If quiz metadata:
            │               └─ Quiz options (buttons)
            │               └─ Suggested follow-ups (buttons)
            │
            └─ Input Area
                ├─ Text input field
                ├─ Send button
                └─ Help text

        Optional:
        └─ TutorQuizMode (overlaid when quiz in focus)
            ├─ Question text
            ├─ Quiz options
            ├─ Submit button
            └─ Feedback display
```

## State Management

```
useTutorConversation Hook State:
├─ conversation: TutorConversationDto | null
│   ├─ id: string
│   ├─ skillId: string
│   ├─ skillName: string
│   ├─ userId: string
│   ├─ messages: TutorMessageDto[]
│   │   └─ Each message:
│   │       ├─ id: string
│   │       ├─ content: string
│   │       ├─ role: "user" | "tutor"
│   │       ├─ createdAt: string
│   │       └─ metadata?: TutorMessageMetadata
│   │           ├─ isQuiz?: boolean
│   │           ├─ quizType?: "multiple-choice"
│   │           ├─ quizOptions?: string[]
│   │           ├─ correctAnswerIndex?: number
│   │           ├─ answered?: boolean
│   │           └─ answerFeedback?: string
│   ├─ totalQuestionsAsked: number
│   ├─ questionsAnsweredCorrectly: number
│   └─ accuracyPercentage: number
│
├─ messages: TutorMessageDto[] (derived from conversation)
├─ loading: boolean (initial load)
├─ sending: boolean (message in transit)
├─ error: string | null
├─ stats: { totalQuestions, correctAnswers, accuracy }
│
└─ Methods:
    ├─ loadConversation(): Promise<void>
    ├─ sendMessage(content: string): Promise<void>
    ├─ submitQuizAnswer(...): Promise<void>
    ├─ clearMessages(): Promise<void>
    └─ deleteConversation(): Promise<void>

Frontend Local Component State (TutorChatBox):
├─ inputValue: string (current input)
└─ selectedAnswer?: number (in quiz mode)
```

## API Request/Response Examples

### Send Message

```
REQUEST:
POST /api/tutor/{skillId}/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "What is machine learning?"
}

RESPONSE (200 OK):
{
  "data": {
    "id": "msg-123",
    "content": "Machine learning is a subset of artificial intelligence...",
    "role": "tutor",
    "createdAt": "2026-06-11T10:30:00",
    "metadata": null
  },
  "status": "success"
}
```

### Get Conversation

```
REQUEST:
GET /api/tutor/{skillId}/history
Authorization: Bearer {token}

RESPONSE (200 OK):
{
  "data": {
    "id": "conv-456",
    "skillId": "skill-789",
    "skillName": "Machine Learning",
    "userId": "user-123",
    "messages": [
      {
        "id": "msg-1",
        "content": "What is machine learning?",
        "role": "user",
        "createdAt": "2026-06-11T10:30:00",
        "metadata": null
      },
      {
        "id": "msg-2",
        "content": "Machine learning is...",
        "role": "tutor",
        "createdAt": "2026-06-11T10:30:05",
        "metadata": null
      }
    ],
    "totalQuestionsAsked": 2,
    "questionsAnsweredCorrectly": 1,
    "accuracyPercentage": 50.0,
    "lastInteractionAt": "2026-06-11T10:31:00",
    "createdAt": "2026-06-11T10:00:00",
    "active": true
  },
  "status": "success"
}
```

### Submit Quiz Answer

```
REQUEST:
POST /api/tutor/{skillId}/quiz-answer
Authorization: Bearer {token}
Content-Type: application/json

{
  "messageId": "msg-5",
  "answerIndex": 2,
  "answerText": null
}

RESPONSE (200 OK):
{
  "data": {
    "id": "msg-6",
    "content": "Excellent! You're correct. The answer is option C because...",
    "role": "tutor",
    "createdAt": "2026-06-11T10:31:00",
    "metadata": null
  },
  "status": "success"
}
```

## Error Flow

```
User Action
    ↓
useTutorConversation catches error
    ↓
Set error state
    ↓
Show toast notification
    ↓
Log to console (dev mode)
    ↓
User can retry or navigate away
```

Example errors:
- "User not found" (401 Unauthorized)
- "Skill not found" (404 Not Found)
- "Failed to load conversation" (500 Server Error)
- "Network timeout" (no response from API)

## Performance Checkpoints

```
User sends message
    |
    v (1ms) - React renders loading state
    |
    v (50ms) - API request sent
    |
    v (2000-3000ms) - Ollama processes
    |
    v (50ms) - API response received
    |
    v (1ms) - React updates state
    |
    v (16ms) - Framer Motion animation
    |
    Complete (2116-3116ms total) ✓
```

## Scaling Considerations

```
Current Design (fits in memory):
  1 User × 50 conversations × 100 messages each
  = 5,000 messages in JSON
  = ~1-2 MB JSON storage per user

Future Scaling:
  If messages grow > 1,000 per conversation:
  └─ Migrate to separate Message entity
      ├─ Better indexing
      ├─ Pagination support
      └─ Archive old conversations

Multiple instances:
  └─ Use stateless service design (already done)
      └─ Each request is independent
          └─ Can load-balance across servers
```

## Security Checkpoints

```
User Request
    ↓
Authentication
    ├─ Token validation (JWT)
    └─ User identification
    ↓
Authorization
    ├─ Verify user owns skill access
    └─ Prevent cross-user access (unique constraint)
    ↓
Input Validation
    ├─ @NotBlank on message content
    ├─ @Valid on DTOs
    └─ SQL injection prevention (JPA parameterized)
    ↓
Database Constraint
    ├─ Foreign key checks
    ├─ Unique constraint (user_id, skill_id)
    └─ Cascade delete
    ↓
Response Filtering
    └─ Only return user's own data
```

## Monitoring Points

```
Log entry points:
  ├─ TutorBotServiceImpl.sendMessage() - User asks
  ├─ TutorBotServiceImpl.submitQuizAnswer() - Answer submitted
  ├─ AiProvider.generateText() - Ollama call
  ├─ Errors - Exceptions with full context
  └─ Stats - Conversation metrics

Metrics to track:
  ├─ Average message response time
  ├─ Ollama API success rate
  ├─ Quiz accuracy by skill
  ├─ Conversation completion rate
  └─ Database query performance
```

## Rollback Strategy

```
If issues detected:
  1. Disable /ai/tutor route (remove from Routes)
  2. Keep data in database (V39 migration is safe)
  3. Users directed to dashboard
  4. Fix code in feature branch
  5. Re-deploy with fix

Database rollback:
  - Not needed (schema only adds table)
  - Data is isolated in tutor_bot_conversations
  - Existing tables unaffected
```

## Testing Coverage

```
Backend:
  ├─ TutorBotServiceImpl (unit tests)
  │   ├─ sendMessage flow
  │   ├─ Quiz generation logic
  │   ├─ submitQuizAnswer evaluation
  │   └─ Conversation persistence
  │
  ├─ TutorBotController (integration tests)
  │   ├─ POST /api/tutor/{skillId}/message
  │   ├─ GET /api/tutor/{skillId}/history
  │   ├─ POST /api/tutor/{skillId}/quiz-answer
  │   └─ Authentication checks
  │
  └─ Database (migration tests)
      ├─ Table creation
      ├─ Constraints enforcement
      └─ Index performance

Frontend:
  ├─ useTutorConversation (hook tests)
  │   ├─ Auto-load on mount
  │   ├─ sendMessage flow
  │   ├─ Error handling
  │   └─ State updates
  │
  ├─ TutorChatBox (component tests)
  │   ├─ Message rendering
  │   ├─ Input handling
  │   ├─ Auto-scroll
  │   └─ Loading states
  │
  └─ TutorBotPage (integration tests)
      ├─ Full user flow
      ├─ Settings actions
      └─ Navigation
```
