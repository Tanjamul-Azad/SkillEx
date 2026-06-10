# AI Tutor Bot Feature - Implementation Guide

## Overview

The AI Tutor Bot is a conversational learning feature that provides personalized, skill-specific tutoring using local Ollama (gemma2:2b). Each user has a separate conversation thread per skill, with the tutor:

- Answering questions about the skill
- Asking follow-up questions to deepen understanding
- Periodically asking quiz questions to assess knowledge
- Referencing session notes for personalized context
- Providing encouragement and constructive feedback

## Architecture

### Technology Stack
- **Backend**: Spring Boot 3.4, JPA/Hibernate, MySQL
- **Frontend**: React 19 + Vite, TypeScript, Framer Motion
- **AI**: Local Ollama (gemma2:2b model)
- **State Management**: React hooks + service layer

## Backend Implementation

### 1. DTOs

#### TutorMessageDto
Represents a single message in the conversation.

```java
record TutorMessageDto(
    String id,
    @NotBlank String content,
    String role,  // "user" or "tutor"
    String createdAt,
    TutorMessageMetadata metadata
)
```

**Location**: `backend/src/main/java/com/skillex/dto/ai/TutorMessageDto.java`

#### TutorMessageMetadata
Optional metadata for quiz questions and suggestions.

```java
record TutorMessageMetadata(
    Boolean isQuiz,
    String quizType,  // "multiple-choice", "short-answer", "true-false"
    List<String> quizOptions,
    Integer correctAnswerIndex,
    Boolean answered,
    Integer userAnswerIndex,
    String answerFeedback,
    List<String> citedSessions,
    String skillName,
    List<String> suggestedFollowUps
)
```

**Location**: `backend/src/main/java/com/skillex/dto/ai/TutorMessageMetadata.java`

#### TutorConversationDto
The complete conversation history with stats.

```java
record TutorConversationDto(
    String id,
    String skillId,
    String skillName,
    String userId,
    List<TutorMessageDto> messages,
    Integer totalQuestionsAsked,
    Integer questionsAnsweredCorrectly,
    Double accuracyPercentage,
    String lastInteractionAt,
    String createdAt,
    Boolean active
)
```

**Location**: `backend/src/main/java/com/skillex/dto/ai/TutorConversationDto.java`

#### TutorQuizQuestionDto
Used for quiz question tracking.

**Location**: `backend/src/main/java/com/skillex/dto/ai/TutorQuizQuestionDto.java`

### 2. Entity Model

#### TutorBotConversation
JPA entity storing conversation state per user-skill pair.

**Key Fields**:
- `id`: UUID primary key
- `user`: ManyToOne relationship to User
- `skill`: ManyToOne relationship to Skill
- `messagesJson`: LONGTEXT storing serialized message array
- `totalQuestionsAsked`: Integer counter
- `questionsAnsweredCorrectly`: Integer counter
- `accuracyPercentage`: Double (0-100)
- `active`: Boolean flag
- `createdAt`: Timestamp
- `lastInteractionAt`: Timestamp

**Unique Constraint**: `(user_id, skill_id)` — one conversation per user per skill

**Indexes**:
- `idx_user_skill` on (user_id, skill_id)
- `idx_user_id` on user_id

**Location**: `backend/src/main/java/com/skillex/model/TutorBotConversation.java`

### 3. Repository

```java
interface TutorBotConversationRepository extends JpaRepository<TutorBotConversation, String> {
    Optional<TutorBotConversation> findByUserIdAndSkillId(String userId, String skillId);
    List<TutorBotConversation> findByUserIdOrderByLastInteractionAtDesc(String userId);
    List<TutorBotConversation> findActiveConversations(String userId);
    void deleteByUserIdAndSkillId(String userId, String skillId);
}
```

**Location**: `backend/src/main/java/com/skillex/repository/TutorBotConversationRepository.java`

### 4. Service Interface

```java
interface TutorBotService {
    TutorMessageDto sendMessage(String userId, String skillId, String messageContent);
    TutorConversationDto getConversation(String userId, String skillId);
    List<TutorConversationDto> getUserConversations(String userId);
    void deleteConversation(String userId, String skillId);
    void clearConversationMessages(String userId, String skillId);
    TutorMessageDto submitQuizAnswer(String userId, String skillId, String messageId, Integer answerIndex, String answerText);
}
```

**Location**: `backend/src/main/java/com/skillex/service/TutorBotService.java`

### 5. Service Implementation

**Location**: `backend/src/main/java/com/skillex/service/impl/TutorBotServiceImpl.java`

**Key Methods**:

#### sendMessage()
1. Validates user and skill exist
2. Gets or creates conversation
3. Loads message history from JSON
4. Adds user message
5. Loads recent session notes for context
6. Builds prompt for Ollama
7. Generates tutor response via AiProvider
8. Determines if a quiz question should be asked
9. Persists updated conversation

#### submitQuizAnswer()
1. Finds the quiz question message
2. Evaluates answer correctness:
   - Multiple choice: compares with correctAnswerIndex
   - Short answer: uses AI to evaluate
3. Records quiz attempt and updates accuracy
4. Returns feedback message

**Prompt Template**:
```
You are an expert, friendly AI tutor specializing in [SKILL].

The learner is working on improving their [SKILL] skills...

Your goal is to:
1. Answer questions about [SKILL] clearly
2. Ask follow-up questions to deepen understanding
3. Occasionally ask quiz questions
4. Provide encouragement and feedback
5. Reference their previous sessions when relevant

Conversation history:
[Previous messages]

Respond naturally and helpfully. Keep responses to 2-3 sentences unless explaining complex concepts.
```

**Quiz Logic**:
- Asks a quiz every 4-6 messages
- Only asks if not asked recently
- Generates multiple-choice questions

### 6. REST Controller

**Location**: `backend/src/main/java/com/skillex/controller/TutorBotController.java`

**Endpoints**:

#### POST /api/tutor/{skillId}/message
Send a message and get a response.

Request:
```json
{
  "message": "What is machine learning?"
}
```

Response: `TutorMessageDto`

#### GET /api/tutor/{skillId}/history
Get full conversation history.

Response: `TutorConversationDto`

#### GET /api/tutor/conversations/all
Get all conversations for the user.

Response: `List<TutorConversationDto>`

#### DELETE /api/tutor/{skillId}
Delete a conversation permanently.

#### POST /api/tutor/{skillId}/clear
Clear messages (keeps stats).

#### POST /api/tutor/{skillId}/quiz-answer
Submit a quiz answer.

Request:
```json
{
  "messageId": "uuid",
  "answerIndex": 2,
  "answerText": null
}
```

Response: `TutorMessageDto` (feedback)

## Frontend Implementation

### 1. Service Layer

**Location**: `frontend/src/services/tutorBotService.ts`

```typescript
const tutorBotService = {
  sendMessage: (skillId: string, message: string) => TutorMessageDto,
  getConversation: (skillId: string) => TutorConversationDto,
  getAllConversations: () => List<TutorConversationDto>,
  deleteConversation: (skillId: string) => void,
  clearConversation: (skillId: string) => void,
  submitQuizAnswer: (skillId: string, messageId: string, answerIndex?: number, answerText?: string) => TutorMessageDto,
}
```

### 2. Custom Hook

**Location**: `frontend/src/hooks/useTutorConversation.ts`

```typescript
const useTutorConversation = (options: UseTutorConversationOptions) => ({
  conversation: TutorConversationDto | null,
  messages: TutorMessageDto[],
  loading: boolean,
  sending: boolean,
  error: string | null,
  loadConversation: () => Promise<void>,
  sendMessage: (content: string) => Promise<void>,
  submitQuizAnswer: (messageId: string, answerIndex?: number, answerText?: string) => Promise<void>,
  clearMessages: () => Promise<void>,
  deleteConversation: () => Promise<void>,
  stats: { totalQuestions: number; correctAnswers: number; accuracy: number } | null,
})
```

**Features**:
- Automatic conversation loading on mount
- Message deduplication
- Auto-scroll to latest message
- Error handling with toast notifications
- Quiz answer submission with feedback
- Conversation stats tracking

### 3. Components

#### TutorChatBox
Responsive chat interface with message history.

**Location**: `frontend/src/features/ai/components/TutorChatBox.tsx`

**Props**:
- `messages`: Array of messages
- `loading`: Loading state
- `sending`: Message sending state
- `onSendMessage`: Callback to send message
- `className`: Optional CSS classes

**Features**:
- Auto-scroll to bottom
- Message animations (Framer Motion)
- User vs tutor message styling
- Quiz option buttons
- Suggested follow-up buttons
- Loading indicator with typing animation
- Input field with Enter/Shift+Enter support
- Real-time message display

#### TutorQuizMode
Quiz question interface with answer validation.

**Location**: `frontend/src/features/ai/components/TutorQuizMode.tsx`

**Props**:
- `quizMessage`: The quiz question message
- `metadata`: Quiz metadata
- `onAnswerSelected`: Callback when answer submitted
- `loading`: Loading state
- `className`: Optional CSS classes

**Features**:
- Multiple choice option buttons
- Short answer input
- True/false question support
- Answer validation with visual feedback
- Correct answer highlighting
- Detailed feedback explanation
- Difficulty badges
- Smooth animations

### 4. Page Component

**Location**: `frontend/src/features/ai/pages/TutorBotPage.tsx`

**Route**: `/ai/tutor/:skillId`

**Features**:
- Skill selector in header
- Conversation history display
- Quiz statistics (questions asked, accuracy %)
- Settings panel:
  - Clear messages (reset conversation)
  - Delete conversation (permanent)
- Error handling
- Loading states
- Responsive layout (full height, flex)

**Layout**:
```
┌─ Header (skill name, stats, settings) ─────┐
│                                              │
├─ Chat Box (messages, input)  ────────────────┤
│                                              │
│ User Message    →                            │
│              ← Tutor Response                │
│                                              │
│ [Input field with Send button]               │
└──────────────────────────────────────────────┘
```

### 5. Routing

Added to `frontend/src/App.tsx`:

```typescript
const TutorBotPage = React.lazy(() => import('./features/ai/pages/TutorBotPage'));

// In Routes:
<Route path="/ai/tutor/:skillId" element={<TutorBotPage />} />
```

## Database Schema

### Create Migration

File: `backend/src/main/resources/db/migration/V[N]__tutor_bot_conversations.sql`

```sql
CREATE TABLE tutor_bot_conversations (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    skill_id VARCHAR(36) NOT NULL,
    messages_json LONGTEXT NOT NULL,
    total_questions_asked INT NOT NULL DEFAULT 0,
    questions_answered_correctly INT NOT NULL DEFAULT 0,
    accuracy_percentage DOUBLE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    last_interaction_at TIMESTAMP,
    CONSTRAINT fk_tutor_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_tutor_skill FOREIGN KEY (skill_id) REFERENCES skills(id),
    UNIQUE KEY uk_user_skill (user_id, skill_id),
    INDEX idx_user_skill (user_id, skill_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Usage Example

### Backend Usage

```java
// Send a message
TutorMessageDto response = tutorBotService.sendMessage(userId, skillId, "What is React?");

// Get conversation
TutorConversationDto conversation = tutorBotService.getConversation(userId, skillId);

// Get all conversations
List<TutorConversationDto> conversations = tutorBotService.getUserConversations(userId);

// Submit quiz answer
TutorMessageDto feedback = tutorBotService.submitQuizAnswer(userId, skillId, messageId, 1, null);

// Clear messages
tutorBotService.clearConversationMessages(userId, skillId);

// Delete conversation
tutorBotService.deleteConversation(userId, skillId);
```

### Frontend Usage

```typescript
// In a React component
const { messages, sendMessage, submitQuizAnswer, stats } = useTutorConversation({
  skillId: 'skill-123',
  autoLoad: true,
});

// Send a message
await sendMessage("How do I learn React hooks?");

// Submit a quiz answer
await submitQuizAnswer(messageId, answerIndex);

// Display conversation
<TutorChatBox
  messages={messages}
  loading={loading}
  sending={sending}
  onSendMessage={sendMessage}
/>
```

## Tutor Behaviors

### 1. Question Answering
- Responds to user questions about the skill
- Provides clear, conversational explanations
- Keeps responses to 2-3 sentences unless complex

### 2. Follow-up Questions
- Asks "what did you learn?" style questions
- Probes understanding with follow-ups
- References previous session notes when available

### 3. Quiz Questions
- Asked every 4-6 messages
- Multiple-choice format with 4 options
- Mixed difficulty levels
- Includes explanation for correct answer

### 4. Session Note Integration
- Loads recent session notes for context
- References specific concepts from sessions
- Personalized with session partner names
- Reinforces notes between sessions

### 5. Encouragement & Feedback
- Celebrates correct quiz answers
- Provides constructive feedback for wrong answers
- Suggests follow-up practice
- Tracks progress with accuracy %

## Configuration

### Application Properties

Add to `application.properties` or `application.yml`:

```yaml
app:
  ai:
    notes:
      provider: gemma  # Use local Ollama
    gemma:
      url: http://localhost:11434/api/generate
      model: gemma2:2b  # or gemma2:7b
```

### Tutor-Specific Config (in service)

```java
private static final int MAX_CONTEXT_NOTES = 3;  // Recent session notes
private static final int MAX_CHUNKS = 10;  // Message history chunks
```

## Performance Considerations

### Message Storage
- Messages stored as JSON in single LONGTEXT column
- Serialized/deserialized on each request
- Suitable for small-medium conversations (< 1000 messages)
- For scaling: consider separate Message entity

### AI Performance
- Local Ollama (gemma2:2b) on localhost
- ~2-3 second response time on typical hardware
- No API costs or latency from remote services

### Database Indexes
- `idx_user_skill` enables fast user-skill lookups
- `idx_user_id` enables listing user conversations

## Testing

### Backend Tests (JUnit + Mockito)

```java
@SpringBootTest
class TutorBotServiceImplTest {
    @Test
    void testSendMessage() { ... }
    
    @Test
    void testSubmitQuizAnswer_MultipleChoice() { ... }
    
    @Test
    void testSubmitQuizAnswer_ShortAnswer() { ... }
    
    @Test
    void testConversationPersistence() { ... }
}
```

### Frontend Tests (Vitest + React Testing Library)

```typescript
describe('useTutorConversation', () => {
  it('should load conversation on mount', async () => { ... });
  it('should send message and get response', async () => { ... });
  it('should submit quiz answer', async () => { ... });
});

describe('TutorChatBox', () => {
  it('should render messages', () => { ... });
  it('should handle message input', () => { ... });
  it('should display quiz options', () => { ... });
});
```

## Security Considerations

1. **Authentication**: All endpoints require user authentication
2. **Authorization**: Users can only access their own conversations
3. **Input Validation**: All DTOs use `@Valid` and `@NotBlank`
4. **SQL Injection**: JPA parameterized queries prevent SQL injection
5. **XSS Protection**: React automatically escapes content

## Future Enhancements

1. **Conversation Categories**: Organize conversations by date ranges
2. **Export Conversations**: Download chat history as PDF/markdown
3. **Conversation Sharing**: Share tutor sessions with mentors
4. **Adaptive Difficulty**: Adjust quiz difficulty based on performance
5. **Voice Input**: Speech-to-text for conversational input
6. **Session Integration**: Auto-reference relevant session notes
7. **Multi-language Support**: Support multiple languages
8. **Advanced Analytics**: Detailed learning analytics per skill
9. **Tutor Personality**: Customize tutor tone/style per skill
10. **Rate Limiting**: Prevent API abuse with request throttling

## Troubleshooting

### Ollama Connection Issues
```
Error: Connection refused to localhost:11434

Solution:
1. Start Ollama: ollama serve
2. Pull model: ollama pull gemma2:2b
3. Check: curl http://localhost:11434/api/tags
```

### Messages Not Persisting
```
Check:
1. Database connection working
2. Migration V[N]__tutor_bot_conversations.sql executed
3. User and Skill records exist in database
```

### Quiz Questions Not Appearing
```
Check:
1. Message history contains at least 4 messages
2. Last quiz was asked more than 6 messages ago
3. Ollama is returning valid responses
```

## Files Summary

### Backend
- `TutorMessageDto.java` - Message DTO
- `TutorMessageMetadata.java` - Metadata for quizzes
- `TutorConversationDto.java` - Conversation DTO
- `TutorQuizQuestionDto.java` - Quiz tracking DTO
- `TutorBotConversation.java` - JPA entity
- `TutorBotConversationRepository.java` - JPA repository
- `TutorBotService.java` - Service interface
- `TutorBotServiceImpl.java` - Service implementation
- `TutorBotController.java` - REST controller
- `V[N]__tutor_bot_conversations.sql` - Database migration

### Frontend
- `tutorBotService.ts` - API service
- `useTutorConversation.ts` - Custom hook
- `TutorChatBox.tsx` - Chat interface component
- `TutorQuizMode.tsx` - Quiz component
- `TutorBotPage.tsx` - Main page component
- `App.tsx` - Route registration

## Dependencies

### Backend
- Spring Boot 3.4
- Spring Data JPA
- Jackson (JSON serialization)
- Jakarta Persistence API
- Lombok

### Frontend
- React 19
- Vite
- TypeScript
- Framer Motion (animations)
- Lucide React (icons)
- Tailwind CSS

## Support

For issues or questions about the AI Tutor Bot implementation, refer to:
- Backend: Spring Boot documentation, Hibernate docs
- Frontend: React docs, Framer Motion docs
- AI: Ollama documentation, local model setup guides
