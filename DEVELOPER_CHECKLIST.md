# AI Tutor Bot - Developer Integration Checklist

Use this checklist to verify the implementation and get the feature running locally.

## Pre-Integration (Before Running)

- [ ] Clone/pull latest code
- [ ] Review `IMPLEMENTATION_COMPLETE.md` for overview
- [ ] Read `AI_TUTOR_BOT_IMPLEMENTATION.md` for architecture
- [ ] Verify Ollama is installed and running

## Backend Setup

- [ ] Maven compiles without errors: `./mvnw clean compile`
- [ ] All new Java files created:
  - [ ] `backend/src/main/java/com/skillex/dto/ai/TutorMessageDto.java`
  - [ ] `backend/src/main/java/com/skillex/dto/ai/TutorMessageMetadata.java`
  - [ ] `backend/src/main/java/com/skillex/dto/ai/TutorConversationDto.java`
  - [ ] `backend/src/main/java/com/skillex/dto/ai/TutorQuizQuestionDto.java`
  - [ ] `backend/src/main/java/com/skillex/model/TutorBotConversation.java`
  - [ ] `backend/src/main/java/com/skillex/repository/TutorBotConversationRepository.java`
  - [ ] `backend/src/main/java/com/skillex/service/TutorBotService.java`
  - [ ] `backend/src/main/java/com/skillex/service/impl/TutorBotServiceImpl.java`
  - [ ] `backend/src/main/java/com/skillex/controller/TutorBotController.java`

- [ ] Database migration created:
  - [ ] `backend/src/main/resources/db/migration/V39__tutor_bot_conversations.sql`

- [ ] Start Spring Boot: `./mvnw spring-boot:run`
  - [ ] No compilation errors
  - [ ] No startup exceptions
  - [ ] See "Migration executed successfully" for V39

- [ ] Verify database migration:
  ```sql
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_NAME = 'tutor_bot_conversations' AND TABLE_SCHEMA = DATABASE();
  ```
  - [ ] Table exists
  - [ ] Columns match schema in SQL file

## Frontend Setup

- [ ] All new TypeScript files created:
  - [ ] `frontend/src/services/tutorBotService.ts`
  - [ ] `frontend/src/hooks/useTutorConversation.ts`
  - [ ] `frontend/src/features/ai/components/TutorChatBox.tsx`
  - [ ] `frontend/src/features/ai/components/TutorQuizMode.tsx`
  - [ ] `frontend/src/features/ai/pages/TutorBotPage.tsx`

- [ ] App.tsx updated:
  - [ ] Import added: `const TutorBotPage = React.lazy(...)`
  - [ ] Route added: `<Route path="/ai/tutor/:skillId" element={<TutorBotPage />} />`

- [ ] Frontend builds without errors: `npm run build`
  - [ ] No TypeScript errors
  - [ ] No component errors

- [ ] Development server runs: `npm run dev`
  - [ ] App loads at http://localhost:5173
  - [ ] No console errors

## Ollama Verification

- [ ] Ollama service running:
  ```bash
  curl http://localhost:11434/api/tags
  ```
  - [ ] Returns JSON with available models

- [ ] Gemma2 model available:
  ```bash
  ollama list
  ```
  - [ ] Shows gemma2:2b

- [ ] Model can generate text:
  ```bash
  curl http://localhost:11434/api/generate -d '{"model":"gemma2:2b","prompt":"Hello","stream":false}'
  ```
  - [ ] Returns response with generated text

## Manual Testing - Basic Flow

### Login and Navigate

- [ ] Login to application
- [ ] Navigate to dashboard
- [ ] Find a skill to learn (or create test skill)
- [ ] Click on skill

### First Message

- [ ] Navigate to `/ai/tutor/{valid-skill-uuid}`
- [ ] See "TutorBotPage" header with skill name
- [ ] See empty chat with "Start learning!" message
- [ ] Type a question: "What is this skill about?"
- [ ] Click Send or press Enter
  - [ ] User message appears on right
  - [ ] "Typing..." indicator shows
  - [ ] Tutor response appears on left
  - [ ] Response is relevant to skill
  - [ ] Timestamp shows on messages

### Conversation Flow

- [ ] Send 4-6 more messages to tutor
  - [ ] Messages appear in order
  - [ ] No duplicates
  - [ ] Auto-scrolls to latest
  - [ ] Timestamps are accurate

- [ ] After 4-6 messages, quiz question appears
  - [ ] Has "Quiz Question" badge
  - [ ] Shows question text
  - [ ] Shows 4 options (A/B/C/D)
  - [ ] Options are buttons

### Quiz Interaction

- [ ] Click one of the quiz options
  - [ ] Option highlights (changes color)
  - [ ] "Check Answer" button appears

- [ ] Click "Check Answer"
  - [ ] Option buttons disable
  - [ ] Feedback message appears below
  - [ ] Shows "Correct!" or "Not quite"
  - [ ] Explains the answer

- [ ] Check stats in header
  - [ ] "Quiz Questions" count increased
  - [ ] Accuracy percentage shows (0%, 50%, 100%, etc.)

### Conversation Stats

- [ ] Header shows:
  - [ ] Skill name
  - [ ] Number of quiz questions asked
  - [ ] Accuracy percentage
  - [ ] Sparkles icon for tutor

### Settings Panel

- [ ] Click settings icon (gear)
  - [ ] Settings panel expands
  - [ ] Shows "Clear Messages" button
  - [ ] Shows "Delete All" button

- [ ] Click "Clear Messages"
  - [ ] Chat clears (no messages visible)
  - [ ] Stats preserved (quiz count still shows)
  - [ ] Can send new messages

### Restart Conversation

- [ ] Refresh page (F5)
- [ ] Navigate back to same skill
  - [ ] Previous messages reappear
  - [ ] Stats still there
  - [ ] Conversation restored

### Delete Conversation

- [ ] Open settings again
- [ ] Click "Delete All"
  - [ ] Confirmation dialog
- [ ] Confirm delete
  - [ ] Redirects to dashboard
  - [ ] Navigate back to skill
  - [ ] Empty conversation starts
  - [ ] Stats reset to 0

## Manual Testing - Error Cases

- [ ] Navigate to `/ai/tutor/{invalid-uuid}`
  - [ ] See error message
  - [ ] Redirects to dashboard

- [ ] Stop Ollama service
  - [ ] Send message
  - [ ] See error toast
  - [ ] Can retry

- [ ] Check network (DevTools)
- [ ] Simulate network failure
  - [ ] See "Failed to send message" error
  - [ ] Can retry

## API Testing (Postman/curl)

### Get Conversation (Fresh)

```bash
curl -X GET http://localhost:8080/api/tutor/{skillId}/history \
  -H "Authorization: Bearer {token}"
```

Expected:
- [ ] 200 OK
- [ ] Contains empty messages array
- [ ] Stats all 0

### Send Message

```bash
curl -X POST http://localhost:8080/api/tutor/{skillId}/message \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello tutor"}'
```

Expected:
- [ ] 200 OK
- [ ] Returns TutorMessageDto
- [ ] Content is tutor response
- [ ] Role is "tutor"
- [ ] Has id and createdAt

### Get Updated Conversation

```bash
curl -X GET http://localhost:8080/api/tutor/{skillId}/history \
  -H "Authorization: Bearer {token}"
```

Expected:
- [ ] 200 OK
- [ ] Messages array has 2 items (user + tutor)
- [ ] totalQuestionsAsked is 0 (no quiz yet)

### Send Multiple Messages

Send 5 more messages and verify:
- [ ] Each returns 200 OK
- [ ] Messages array grows
- [ ] Eventually quiz appears (metadata.isQuiz = true)

### Submit Quiz Answer

```bash
curl -X POST http://localhost:8080/api/tutor/{skillId}/quiz-answer \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "{quizMessageId}",
    "answerIndex": 1,
    "answerText": null
  }'
```

Expected:
- [ ] 200 OK
- [ ] Returns feedback message
- [ ] Content explains answer
- [ ] Quiz marked as answered

### Get Final Conversation

```bash
curl -X GET http://localhost:8080/api/tutor/{skillId}/history \
  -H "Authorization: Bearer {token}"
```

Expected:
- [ ] totalQuestionsAsked > 0
- [ ] questionsAnsweredCorrectly >= 0
- [ ] accuracyPercentage calculated correctly
- [ ] lastInteractionAt updated

## Database Verification

```sql
SELECT * FROM tutor_bot_conversations;
```

- [ ] Records exist
- [ ] One record per user-skill pair
- [ ] messages_json is valid JSON
- [ ] total_questions_asked matches quiz count
- [ ] accuracy_percentage calculated

```sql
DESCRIBE tutor_bot_conversations;
```

- [ ] All columns present
- [ ] All indexes created

## Performance Testing

- [ ] Send message and note response time
  - Target: 2-3 seconds (Ollama generation)
  - [ ] Time is acceptable
  - [ ] No timeout errors

- [ ] Load 20+ messages
  - [ ] Scrolling is smooth
  - [ ] No lag
  - [ ] Memory usage reasonable

## Browser Testing

- [ ] Chrome
  - [ ] All features work
  - [ ] No console errors
  - [ ] Responsive on desktop and mobile

- [ ] Firefox
  - [ ] All features work
  - [ ] Animations smooth

- [ ] Safari
  - [ ] All features work
  - [ ] Touch interaction works on iPad

## Mobile Testing

- [ ] iPhone/Android
  - [ ] Chat interface usable on small screen
  - [ ] Input field accessible
  - [ ] Quiz options tappable
  - [ ] Auto-scroll works
  - [ ] Animations smooth

## Accessibility Testing

- [ ] Tab through interface
  - [ ] All buttons reachable
  - [ ] Input focusable

- [ ] Screen reader (NVDA/JAWS)
  - [ ] Messages announced
  - [ ] Buttons labeled
  - [ ] Quiz instructions clear

## Code Quality Checks

### Java Code

- [ ] No warnings in IDE
- [ ] All imports used
- [ ] No TODO comments
- [ ] Logging appropriate
- [ ] Error messages clear
- [ ] Code formatted (Ctrl+Alt+L)

### TypeScript Code

- [ ] `npm run lint` passes
- [ ] No TypeScript errors
- [ ] All types strict
- [ ] No `any` types
- [ ] All imports used
- [ ] Code formatted (Prettier)

## Documentation Verification

- [ ] `AI_TUTOR_BOT_IMPLEMENTATION.md` exists and is readable
- [ ] `TUTOR_BOT_INTEGRATION.md` exists and is readable
- [ ] `TUTOR_BOT_FLOW.md` exists and is readable
- [ ] Code comments are helpful
- [ ] JavaDoc on all public methods
- [ ] JSDoc on all functions

## Final Sign-Off

- [ ] All checklist items completed
- [ ] All tests passed
- [ ] No known bugs
- [ ] Feature ready for production
- [ ] Documentation complete
- [ ] Team notified

## Known Limitations (Document for Users)

- [ ] Ollama needs to be running
- [ ] Response time depends on system
- [ ] Messages stored as JSON (limit ~1000 per conversation)
- [ ] No multi-device sync
- [ ] Quiz questions are basic format

## Rollback Plan (If Issues Found)

If serious issues:

1. [ ] Comment out route in App.tsx
2. [ ] Redeploy frontend
3. [ ] Feature disabled (users can't access)
4. [ ] Fix code in feature branch
5. [ ] Re-test
6. [ ] Re-enable route

Database is safe (new table, isolated from rest of app).

## Sign-Off

- Developer: _______________
- Date: _______________
- Notes: _______________

---

**Once all items are checked, the feature is production-ready.**
